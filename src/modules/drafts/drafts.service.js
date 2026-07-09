const prisma = require('../../config/db');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const getAll = async (query, user) => {
  const { matter_id, status, page = 1, limit = 10 } = query;
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const where = {};
  if (matter_id) where.matter_id = parseInt(matter_id);
  if (status) where.status = status;
  if (user?.role === 'lawyer') where.matter = { assigned_lawyer_id: user.id };
  if (user?.role === 'client') {
    where.matter = {
      OR: [
        { client: { user_id: user.id } },
        { parties: { some: { user_id: user.id } } }
      ]
    };
  }

  return await prisma.draft.findMany({
    where,
    skip,
    take,
    include: {
      matter: { select: { id: true, title: true } },
      created_by: { select: { id: true, full_name: true } }
    },
    orderBy: { created_at: 'desc' },
  });
};

const getById = async (id, user) => {
  const draft = await prisma.draft.findUnique({
    where: { id: parseInt(id) },
    include: {
      signatures: {
        select: { id: true, signed_at: true, ip_address: true, signed_by_user_id: true }
      },
      created_by: { select: { id: true, full_name: true } }
    }
  });
  if (!draft) return null;
  if (user?.role === 'lawyer') {
    const ok = await prisma.matter.count({ where: { id: draft.matter_id, assigned_lawyer_id: user.id } });
    if (!ok) {
      const err = new Error('Not authorized to access this draft');
      err.statusCode = 403;
      throw err;
    }
  }
  if (user?.role === 'client') {
    const ok = await prisma.matter.count({
      where: {
        id: draft.matter_id,
        OR: [
          { client: { user_id: user.id } },
          { parties: { some: { user_id: user.id } } }
        ]
      }
    });
    if (!ok || !['sent_for_signature', 'signed'].includes(draft.status)) {
      const err = new Error('Not authorized to access this draft');
      err.statusCode = 403;
      throw err;
    }
  }
  return draft;
};

const create = async (data, user) => {
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: data.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to create draft for this matter');
      err.statusCode = 403;
      throw err;
    }
    data.created_by_user_id = user.id;
    data.last_updated_by_user_id = user.id;
  }
  if (user?.role === 'client') {
    const err = new Error('Client cannot create drafts');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.draft.create({ data });
};

const update = async (id, data, user) => {
  const existing = await prisma.draft.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) {
    const err = new Error('Draft not found');
    err.statusCode = 404;
    throw err;
  }
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: existing.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to update this draft');
      err.statusCode = 403;
      throw err;
    }
    data.last_updated_by_user_id = user.id;
  }
  if (user?.role === 'client') {
    const err = new Error('Client cannot update drafts');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.draft.update({
    where: { id: parseInt(id) },
    data,
  });
};

const remove = async (id, user) => {
  if (user?.role !== 'admin') {
    const err = new Error('Only admin can delete drafts');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.draft.delete({ where: { id: parseInt(id) } });
};

const signDraft = async (draftId, userId, signatureData, ipAddress, deviceInfo, user) => {
  if (user?.role !== 'client') {
    const err = new Error('Only client can sign drafts');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.$transaction(async (tx) => {
    const draftForClient = await tx.draft.findUnique({
      where: { id: parseInt(draftId, 10) }
    });
    if (!draftForClient) {
      const err = new Error('Draft not found');
      err.statusCode = 404;
      throw err;
    }
    const isAuthorizedSigner = await tx.matter.count({
      where: {
        id: draftForClient.matter_id,
        OR: [
          { client: { user_id: userId } },
          { parties: { some: { user_id: userId } } }
        ]
      }
    });
    if (isAuthorizedSigner === 0) {
      const err = new Error('Not authorized to sign this draft');
      err.statusCode = 403;
      throw err;
    }
    // 1. Create signature record
    const signature = await tx.signature.create({
      data: {
        draft_id: parseInt(draftId),
        signed_by_user_id: userId,
        signature_data: signatureData,
        ip_address: ipAddress,
        device_info: deviceInfo,
        signed_at: new Date()
      }
    });

    // 2. Update draft status
    const draft = await tx.draft.update({
      where: { id: parseInt(draftId) },
      data: {
        status: 'signed',
        signed_at: new Date()
      }
    });

    // 3. Log activity
    await tx.activity.create({
      data: {
        matter_id: draft.matter_id,
        entity_type: 'signature',
        entity_id: signature.id,
        action: 'signed',
        description: `Draft "${draft.title}" signed by client`,
        actor_user_id: userId
      }
    });

    return { signature, draft };
  });
};

const resolveTemplateVariables = (content, draft, matter, company) => {
  if (!content) return '';
  let resolved = content;

  const primaryClient = matter?.client;
  const attorneyName = matter?.assigned_lawyer?.full_name || '';
  const recipientName = primaryClient?.full_name || '';
  const recipientAddress = [
    primaryClient?.address_line_1 || primaryClient?.home_address || primaryClient?.business_address,
    primaryClient?.address_line_2,
    [primaryClient?.city, primaryClient?.state, primaryClient?.postal_code].filter(Boolean).join(', ')
  ].filter(Boolean).join('\n') || '';

  const todayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const firmName = company.company_name || '';
  const firmAddress = company.address || '';
  const firmPhone = company.phone || '';
  const firmEmail = company.email || '';
  const attorneyFor = primaryClient?.full_name ? `Plaintiff ${primaryClient.full_name}` : 'Plaintiff';
  const courtName = matter?.court_name || 'SUPERIOR COURT OF THE STATE OF CALIFORNIA';
  
  let county = 'LOS ANGELES';
  if (courtName && courtName.toLowerCase().includes('county')) {
    const match = courtName.match(/county\s+of\s+([A-Za-z\s]+)/i) || courtName.match(/([A-Za-z\s]+)\s+county/i);
    if (match) county = match[1].trim().toUpperCase();
  }
  
  const plaintiffName = primaryClient?.full_name || 'PLAINTIFF';
  const defendantName = matter?.opposing_party || 'DEFENDANT';
  const caseNumber = matter?.case_number || matter?.matter_number || '';
  const judge = matter?.judge_name || '';
  const department = matter?.court_room || '';
  const hearingDate = matter?.next_hearing ? new Date(matter.next_hearing).toLocaleDateString('en-US') : '';
  const hearingTime = matter?.next_hearing ? new Date(matter.next_hearing).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
  const complaintFiled = matter?.initial_filing_date ? new Date(matter.initial_filing_date).toLocaleDateString('en-US') : '';
  const trialDate = matter?.trial_date ? new Date(matter.trial_date).toLocaleDateString('en-US') : '';
  const trialTime = matter?.trial_date ? new Date(matter.trial_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  const variables = {
    'FirmName': firmName,
    'AttorneyName': attorneyName,
    'FirmAddress': firmAddress,
    'FirmPhone': firmPhone,
    'FirmEmail': firmEmail,
    'AttorneyFor': attorneyFor,
    'CourtName': courtName,
    'County': county,
    'PlaintiffName': plaintiffName,
    'DefendantName': defendantName,
    'CaseNumber': caseNumber,
    'Judge': judge,
    'Department': department,
    'HearingDate': hearingDate,
    'HearingTime': hearingTime,
    'ComplaintFiled': complaintFiled,
    'TrialDate': trialDate,
    'TrialTime': trialTime,
    'TodayDate': todayDate,
    'MatterNumber': matter?.matter_number || '',
    'MatterTitle': matter?.title || '',
    'PartyName': recipientName,
    'RecipientName': recipientName,
    'RecipientAddress': recipientAddress,
  };

  const mappings = {
    ...variables,
    'client_name': recipientName,
    'current_date': todayDate,
    'matter_number': matter?.matter_number || '',
    'matter_title': matter?.title || '',
    'lawyer_name': attorneyName,
    'firm_name': firmName,
    'firm_address': firmAddress,
    'firm_phone': firmPhone,
    'firm_email': firmEmail,
    'attorney_name': attorneyName,
    'attorney_for': attorneyFor,
    'court_name': courtName,
    'county': county,
    'plaintiff_name': plaintiffName,
    'defendant_name': defendantName,
    'case_number': caseNumber,
    'judge': judge,
    'department': department,
    'hearing_date': hearingDate,
    'hearing_time': hearingTime,
    'complaint_filed': complaintFiled,
    'trial_date': trialDate,
    'trial_time': trialTime,
    'today_date': todayDate,
  };

  Object.entries(mappings).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    resolved = resolved.replace(regex, value);
  });

  return resolved;
};

const generatePdf = (draftId, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      const draft = await getById(draftId, user);
      if (!draft) return reject(new Error('Draft not found'));

      const company = await prisma.companyProfile.findFirst() || {};

      let matter = null;
      try {
        matter = await prisma.matter.findUnique({
          where: { id: draft.matter_id },
          include: { 
            client: true,
            assigned_lawyer: true
          }
        });
      } catch (err) {
        console.warn('Could not load matter details for placeholder resolution', err);
      }

      const resolvedContent = resolveTemplateVariables(draft.content, draft, matter, company);

      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      const categoryLower = (draft.category || '').toLowerCase().trim();
      const isPleading = categoryLower === 'pleading';
      const isLetter = !isPleading;

      const primaryClient = matter?.client;
      const attorneyName = matter?.assigned_lawyer?.full_name || '';
      const firmName = company.company_name || '';
      const firmAddress = company.address || '';
      const firmPhone = company.phone || '';
      const firmEmail = company.email || '';
      const attorneyFor = primaryClient?.full_name ? `Plaintiff ${primaryClient.full_name}` : 'Plaintiff';
      const courtName = matter?.court_name || 'SUPERIOR COURT OF THE STATE OF CALIFORNIA';

      let county = 'LOS ANGELES';
      let match = null;
      if (courtName && courtName.toLowerCase().includes('county')) {
        match = courtName.match(/county\s+of\s+([A-Za-z\s]+)/i) || courtName.match(/([A-Za-z\s]+)\s+county/i);
        if (match) county = match[1].trim().toUpperCase();
      }

      const plaintiffName = primaryClient?.full_name || 'PLAINTIFF';
      const defendantName = matter?.opposing_party || 'DEFENDANT';
      const caseNumber = matter?.case_number || matter?.matter_number || '';
      const judge = matter?.judge_name || '';
      const department = matter?.court_room || '';
      const hearingDate = matter?.next_hearing ? new Date(matter.next_hearing).toLocaleDateString('en-US') : '';
      const hearingTime = matter?.next_hearing ? new Date(matter.next_hearing).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
      const complaintFiled = matter?.initial_filing_date ? new Date(matter.initial_filing_date).toLocaleDateString('en-US') : '';
      const trialDate = matter?.trial_date ? new Date(matter.trial_date).toLocaleDateString('en-US') : '';
      const trialTime = matter?.trial_date ? new Date(matter.trial_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
      
      const variables = {
        FirmName: firmName,
        AttorneyName: attorneyName,
        FirmAddress: firmAddress,
        FirmPhone: firmPhone,
        FirmEmail: firmEmail,
        AttorneyFor: attorneyFor,
        CourtName: courtName,
        County: county,
        PlaintiffName: plaintiffName,
        DefendantName: defendantName,
        CaseNumber: caseNumber,
        Judge: judge,
        Department: department,
        HearingDate: hearingDate,
        HearingTime: hearingTime,
        ComplaintFiled: complaintFiled,
        TrialDate: trialDate,
        TrialTime: trialTime
      };

      console.log(`[PDF Gen Log] Draft ID: ${draft.id}, Category: ${draft.category}, isPleading: ${isPleading}, isLetter: ${isLetter}`);

      if (isPleading) {
        console.log('[PDF Gen Log] Executing PLEADING template branch');
        
        // Setup margins for pleading
        doc.page.margins = { top: 50, bottom: 50, left: 75, right: 72 };

        const drawPleadingGrid = (pdfDoc) => {
          pdfDoc.save();
          // Draw left double vertical lines at standard 1 inch boundary
          pdfDoc.strokeColor('#cbd5e1').lineWidth(0.5);
          pdfDoc.moveTo(60, 40).lineTo(60, pdfDoc.page.height - 40).stroke();
          pdfDoc.moveTo(62, 40).lineTo(62, pdfDoc.page.height - 40).stroke();

          // Draw right vertical line
          pdfDoc.moveTo(552, 40).lineTo(552, pdfDoc.page.height - 40).stroke();

          // Draw line numbers 1 to 28
          pdfDoc.fontSize(8).font('Helvetica').fillColor('#64748b');
          const startY = 54;
          const lineSpacing = 24.1;
          for (let i = 1; i <= 28; i++) {
            const y = startY + (i - 1) * lineSpacing;
            if (y < pdfDoc.page.height - 40) {
              pdfDoc.text(String(i), 30, y, { align: 'right', width: 20 });
            }
          }
          pdfDoc.restore();
        };

        // Draw grid on page 1
        drawPleadingGrid(doc);

        // Listen for next pages
        doc.on('pageAdded', () => {
          drawPleadingGrid(doc);
        });

        // Content settings to align with grid lines
        const textOptions = {
          width: 465,
          align: 'justify',
          lineGap: 14.1
        };

        // 1. Attorney Block
        doc.x = 75;
        doc.y = 54;
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#111827');
        doc.text(variables.AttorneyName || '', { width: 465 });
        doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
        if (variables.FirmName) doc.text(variables.FirmName);
        if (variables.FirmAddress) doc.text(variables.FirmAddress);
        if (variables.FirmPhone) doc.text(`Telephone: ${variables.FirmPhone}`);
        if (variables.FirmEmail) doc.text(`Email: ${variables.FirmEmail}`);
        doc.text(`Attorney for ${variables.AttorneyFor}`);
        doc.moveDown(1.5);

        // 2. Court Caption Header
        doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#111827');
        doc.text(variables.CourtName.toUpperCase(), { align: 'center', width: 465 });
        doc.text(`FOR THE COUNTY OF ${variables.County.toUpperCase()}`, { align: 'center', width: 465 });
        doc.moveDown(1.5);

        // 3. Caption Details Box
        const captionStartY = doc.y;
        
        // Left Column (Parties)
        doc.x = 75;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
        doc.text(variables.PlaintiffName, { width: 210 });
        doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
        doc.text('Plaintiff,', 90, doc.y + 2);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('vs.', 120, doc.y);
        doc.moveDown(0.5);
        doc.text(variables.DefendantName, 75, doc.y, { width: 210 });
        doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
        doc.text('Defendant.', 90, doc.y + 2);
        const leftColumnEndY = doc.y;

        // Right Column (Case Details Info)
        doc.x = 310;
        doc.y = captionStartY;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
        doc.text(`Case No.: ${variables.CaseNumber}`, { width: 220 });
        doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
        if (variables.Judge) doc.text(`Judge: ${variables.Judge}`, { width: 220 });
        if (variables.Department) doc.text(`Dept: ${variables.Department}`, { width: 220 });
        if (variables.HearingDate) {
          doc.text(`Hearing Date: ${variables.HearingDate}`, { width: 220 });
          if (variables.HearingTime) doc.text(`Time: ${variables.HearingTime}`, { width: 220 });
        }
        if (variables.ComplaintFiled) doc.text(`Complaint Filed: ${variables.ComplaintFiled}`, { width: 220 });
        if (variables.TrialDate) {
          doc.text(`Trial Date: ${variables.TrialDate}`, { width: 220 });
          if (variables.TrialTime) doc.text(`Time: ${variables.TrialTime}`, { width: 220 });
        }
        const rightColumnEndY = doc.y;

        // Vertical Caption Line
        const captionEndY = Math.max(leftColumnEndY, rightColumnEndY) + 15;
        doc.moveTo(295, captionStartY - 10)
           .lineTo(295, captionEndY - 5)
           .strokeColor('#cbd5e1')
           .lineWidth(1)
           .stroke();

        // Caption Box Bottom line
        doc.moveTo(75, captionEndY)
           .lineTo(540, captionEndY)
           .strokeColor('#cbd5e1')
           .lineWidth(1)
           .stroke();

        // Document Title
        doc.x = 75;
        doc.y = captionEndY + 20;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(draft.title.toUpperCase(), { align: 'center', width: 465 });
        doc.moveDown(1.5);

        // Body Content
        doc.fontSize(10).font('Helvetica').fillColor('#1f2937');
        doc.text(resolvedContent || 'No content provided.', textOptions);

        // Signature block
        doc.moveDown(3);
        const sigY = doc.y;
        doc.fontSize(10).font('Helvetica').fillColor('#111827');
        doc.text('Respectfully submitted,', 300, sigY, { width: 240 });
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text(variables.FirmName, 300, doc.y, { width: 240 });
        doc.moveDown(1.5);
        doc.text(`By: ___________________________`, 300, doc.y, { width: 240 });
        doc.font('Helvetica').text(variables.AttorneyName, 320, doc.y + 3, { width: 220 });
        doc.text(`Attorney for ${variables.AttorneyFor}`, 300, doc.y + 3, { width: 240 });

      } else if (isLetter) {
        console.log('[PDF Gen Log] Executing LETTER template branch');
        
        // Draw professional letterhead
        let logoDrawn = false;
        const logoWidth = 100;
        const startX = 50;
        const startY = 30;

        // Top Divider Line
        doc.moveTo(50, 20)
           .lineTo(doc.page.width - 50, 20)
           .strokeColor('#cbd5e1')
           .lineWidth(0.75)
           .stroke();

        // Try logo from letterhead upload first, then default logo url
        if (company.letterhead_url) {
          try {
            const letterheadPath = path.join(process.cwd(), company.letterhead_url);
            if (fs.existsSync(letterheadPath)) {
              const img = doc.openImage(letterheadPath);
              const aspectRatio = img.width / img.height;
              // If it's a square/logo, treat as logoFromLetterhead
              if (!(aspectRatio > 1.8 || (aspectRatio >= 0.65 && aspectRatio <= 0.85))) {
                doc.image(img, startX, startY, { width: logoWidth });
                logoDrawn = true;
              }
            }
          } catch (e) {
            console.warn('Could not load logo from letterhead url', e);
          }
        }

        if (!logoDrawn && company.logo_url) {
          try {
            const logoPath = path.join(process.cwd(), company.logo_url);
            if (fs.existsSync(logoPath)) {
              doc.image(logoPath, startX, startY, { width: logoWidth });
              logoDrawn = true;
            }
          } catch (e) {
            console.warn('Could not load firm logo', e);
          }
        }

        const companyX = logoDrawn ? 165 : 50;

        // Firm Name (more prominent, vertically aligned with logo)
        doc.fillColor('#111827');
        doc.fontSize(22).font('Helvetica-Bold').text(company.company_name || '', companyX, 30);

        // Address (slightly shifted to account for larger font size)
        doc.fontSize(9.5).fillColor('#4b5563').font('Helvetica');
        if (company.address) {
          doc.text(company.address, companyX, doc.y + 3);
        }

        // Phone | Email | Website
        const contactParts = [];
        if (company.phone) contactParts.push(company.phone);
        if (company.email) contactParts.push(company.email);
        if (company.website) contactParts.push(company.website);

        if (contactParts.length > 0) {
          doc.text(contactParts.join('   |   '), companyX, doc.y + 4);
        }

        // Bottom Divider Line (placed dynamically below logo and text details)
        const lineY = Math.max(doc.y + 12, 105);
        doc.moveTo(50, lineY)
           .lineTo(doc.page.width - 50, lineY)
           .strokeColor('#cbd5e1')
           .lineWidth(0.5)
           .stroke();

        // Spacing before content
        doc.x = 50;
        doc.y = lineY + 30;

        // Date
        const dateStr = new Date(draft.updated_at || new Date()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.fontSize(11).fillColor('#111827').font('Helvetica').text(dateStr);
        doc.moveDown(2);

        // Recipient
        if (matter && matter.client) {
          const client = matter.client;
          doc.fontSize(11).fillColor('#111827').font('Helvetica-Bold').text(client.full_name || '');
          doc.font('Helvetica');

          const clientAddress = [
            client.address_line_1 || client.home_address || client.business_address,
            client.address_line_2,
            [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
            client.country
          ].filter(Boolean).join('\n');

          if (clientAddress) {
            doc.text(clientAddress, { lineGap: 3 });
          }
          doc.moveDown(2);
        }

        // Subject
        doc.fontSize(11).fillColor('#111827').font('Helvetica-Bold').text(`RE: ${draft.title.toUpperCase()}`);
        doc.font('Helvetica');
        doc.moveDown(2);

        // Letter Body Content
        doc.fontSize(11).fillColor('#1f2937').text(resolvedContent || 'No content provided.', {
          lineGap: 4,
          paragraphGap: 14,
          align: 'left'
        });

      } else {
        console.log('[PDF Gen Log] Executing BURGUNDY template branch');
        // Fallback to original burgundy wave template for other categories
        let logoDrawn = false;
        let letterheadDrawnAsBackground = false;
        let logoFromLetterhead = null;

        if (company.letterhead_url) {
          try {
            const letterheadPath = path.join(process.cwd(), company.letterhead_url);
            if (fs.existsSync(letterheadPath)) {
              const img = doc.openImage(letterheadPath);
              const aspectRatio = img.width / img.height;

              if (aspectRatio > 1.8) {
                doc.image(img, 0, 0, { width: doc.page.width });
                letterheadDrawnAsBackground = true;
                doc.y = (doc.page.width / aspectRatio) + 20; 
              } else if (aspectRatio >= 0.65 && aspectRatio <= 0.85) {
                doc.image(img, 0, 0, { width: doc.page.width, height: doc.page.height });
                letterheadDrawnAsBackground = true;
                doc.y = 180;
              } else {
                logoFromLetterhead = img;
              }
            }
          } catch (e) {
            console.warn('Could not load letterhead', e);
          }
        }

        if (!letterheadDrawnAsBackground) {
          doc.save();

          doc.fillColor('#7d132a');
          doc.moveTo(0, 0)
             .lineTo(doc.page.width, 0)
             .lineTo(doc.page.width, 160)
             .quadraticCurveTo(doc.page.width / 2, 90, 0, 110)
             .fill();

          doc.fillColor('#d41639');
          doc.moveTo(0, 100)
             .quadraticCurveTo(doc.page.width / 2, 80, doc.page.width, 150)
             .lineTo(doc.page.width, 170)
             .quadraticCurveTo(doc.page.width / 2, 100, 0, 120)
             .fill();

          doc.fillColor('#7d132a');
          doc.moveTo(0, doc.page.height)
             .lineTo(250, doc.page.height)
             .lineTo(0, doc.page.height - 150)
             .fill();

          doc.fillColor('#d41639');
          doc.moveTo(0, doc.page.height - 160)
             .lineTo(270, doc.page.height)
             .lineTo(240, doc.page.height)
             .lineTo(0, doc.page.height - 140)
             .fill();

          doc.restore();
        }

        if (logoFromLetterhead) {
          doc.image(logoFromLetterhead, 50, 30, { width: 80 });
          logoDrawn = true;
        } else if (company.logo_url && !logoDrawn) {
          try {
            const logoPath = path.join(process.cwd(), company.logo_url);
            if (fs.existsSync(logoPath)) {
              doc.image(logoPath, 50, 30, { width: 80 });
              logoDrawn = true;
            }
          } catch (e) {
            console.warn('Could not load logo', e);
          }
        }

        if (company.company_name || true) {
          const companyX = logoDrawn ? 140 : 50;
          doc.fontSize(24).fillColor('#ffffff').text(company.company_name || 'COMPANY NAME', companyX, 35);
          doc.fontSize(10).fillColor('#ffffff').text(company.website || 'PLACE YOUR TEXT HERE', companyX, 65);

          doc.fontSize(10).fillColor('#ffffff');
          const contactX = doc.page.width - 220;
          doc.text(`Phone: ${company.phone || '111-456-9870'}`, contactX, 30);
          doc.text(`Email: ${company.email || 'email@example.com'}`, contactX, 50);
          doc.text(`Location: ${company.address || 'city, state, zip'}`, contactX, 70);
        }

        doc.x = 50;
        doc.y = 190;

        doc.fillColor('#000000');
        doc.fontSize(20).text(draft.title, { align: 'left', width: doc.page.width - 100 });
        doc.moveDown();

        doc.fontSize(12).text(`Matter ID: ${draft.matter_id}`);
        doc.text(`Created By: ${draft.created_by?.full_name || 'System'}`);
        doc.moveDown(2);

        doc.fontSize(11).text(resolvedContent || 'No content provided.');
      }

      // Signature area
      const sigAttorney = matter?.assigned_lawyer?.full_name || draft.created_by?.full_name || '';
      const sigFirm = company.company_name || '';
      if (isPleading) {
        // Handled inside Pleading block
      } else if (isLetter) {
        doc.moveDown(3);
        doc.fontSize(11).fillColor('#1f2937').font('Helvetica').text('Sincerely,');
        doc.moveDown(3);
        if (sigAttorney) {
          doc.fontSize(11).fillColor('#111827').font('Helvetica-Bold').text(sigAttorney);
        }
        if (sigFirm) {
          doc.fontSize(10).fillColor('#4b5563').font('Helvetica').text(sigFirm);
        }
      } else {
        doc.moveDown(6);
        const currentY = doc.y;
        doc.moveTo(50, currentY).lineTo(250, currentY).strokeColor('#000000').lineWidth(1).stroke();
        doc.y = currentY + 10;
        doc.fontSize(11).fillColor('#000000').text('Authorized Signature', 50, doc.y);
        doc.fontSize(10).fillColor('#666666').text(draft.created_by?.full_name || 'System Administrator', 50, doc.y + 15);
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const sendForSignature = async (draftId, recipient_email, user) => {
  if (!recipient_email) {
    const err = new Error('Recipient email is required');
    err.statusCode = 400;
    throw err;
  }
  const draft = await getById(draftId, user);
  if (!draft) throw new Error('Draft not found');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const request = await prisma.signatureRequest.create({
    data: {
      draft_id: parseInt(draftId, 10),
      token,
      recipient_email,
      expires_at: expiresAt,
    }
  });

  await prisma.draft.update({
    where: { id: parseInt(draftId, 10) },
    data: { status: 'sent_for_signature', sent_for_signature_at: new Date() }
  });

  await prisma.activity.create({
    data: {
      matter_id: draft.matter_id,
      entity_type: 'signature_request',
      entity_id: request.id,
      action: 'sent',
      description: `Sent draft "${draft.title}" for signature to ${recipient_email}`,
      actor_user_id: user.id
    }
  });

  console.log(`\n================================`);
  console.log(`MOCK EMAIL SENT TO: ${recipient_email}`);
  console.log(`SUBJECT: Action Required: Signature Requested for ${draft.title}`);
  console.log(`SIGNING LINK: http://localhost:5173/sign/${token}`);
  console.log(`================================\n`);

  return request;
};

const getSignatureRequest = async (token) => {
  const request = await prisma.signatureRequest.findUnique({
    where: { token },
    include: { draft: { include: { matter: true, created_by: true } } }
  });
  if (!request) {
    const err = new Error('Invalid signature token');
    err.statusCode = 404;
    throw err;
  }
  if (request.status === 'completed') {
    const err = new Error('Signature already completed');
    err.statusCode = 400;
    throw err;
  }
  if (new Date() > request.expires_at) {
    const err = new Error('Signature token expired');
    err.statusCode = 400;
    throw err;
  }
  return request;
};

const completeSignature = async (token, signature_data, ip_address, device_info) => {
  const request = await getSignatureRequest(token);

  return await prisma.$transaction(async (tx) => {
    // 1. Create Signature record
    const signature = await tx.signature.create({
      data: {
        draft_id: request.draft_id,
        signed_by_user_id: request.draft.created_by_user_id, // Defaulting to creator since guest signer has no user id
        signature_data,
        ip_address,
        device_info,
        signed_at: new Date()
      }
    });

    // 2. Mark Request completed
    await tx.signatureRequest.update({
      where: { id: request.id },
      data: { status: 'completed', completed_at: new Date() }
    });

    // 3. Generate signed PDF
    const draft = request.draft;
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    doc.fontSize(20).text(draft.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(draft.content || '');
    doc.moveDown(2);
    doc.fontSize(14).text('SIGNATURES', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Signed by: ${request.recipient_email}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);
    doc.text(`IP: ${ip_address || 'Unknown'}`);
    
    if (signature_data && signature_data.startsWith('data:image/png;base64,')) {
      try {
        const imgBuffer = Buffer.from(signature_data.split(',')[1], 'base64');
        doc.moveDown();
        doc.image(imgBuffer, { fit: [200, 100] });
      } catch (e) {
        console.error('Failed to embed signature image', e);
      }
    }
    
    const docEndPromise = new Promise(resolve => doc.on('end', resolve));
    doc.end();
    await docEndPromise;
    const finalPdfBuffer = Buffer.concat(buffers);

    // 4. Save to disk
    const docsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    const diskName = `${Date.now()}_signed_${draft.id}.pdf`;
    const absPath = path.join(docsDir, diskName);
    fs.writeFileSync(absPath, finalPdfBuffer);

    // 5. Create Document record
    const documentRecord = await tx.document.create({
      data: {
        matter_id: draft.matter_id,
        uploaded_by_user_id: draft.created_by_user_id,
        file_name: diskName,
        original_name: `Signed_${draft.title}.pdf`,
        mime_type: 'application/pdf',
        file_path: absPath,
        file_size: finalPdfBuffer.length,
        visibility: 'client_shared',
        category: 'Contract',
      }
    });

    // 6. Update Draft status and signed_document_id
    const updatedDraft = await tx.draft.update({
      where: { id: draft.id },
      data: { 
        status: 'signed', 
        signed_at: new Date(),
        signed_document_id: documentRecord.id
      }
    });

    // 7. Log Activity
    await tx.activity.create({
      data: {
        matter_id: draft.matter_id,
        entity_type: 'draft',
        entity_id: draft.id,
        action: 'signed',
        description: `Draft "${draft.title}" was signed via E-Sign by ${request.recipient_email}`
      }
    });

    return { signature, document: documentRecord, draft: updatedDraft };
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  signDraft,
  generatePdf,
  sendForSignature,
  getSignatureRequest,
  completeSignature,
};