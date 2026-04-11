import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import dayjs from 'dayjs';
import { getCase } from './casesService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultTemplatesDir = path.resolve(__dirname, '../templates');
const templatesDir =
  process.env.DOCUMENT_TEMPLATES_DIR ||
  defaultTemplatesDir;

const TEMPLATE_DEFINITIONS = [
  {
    key: 'court-access',
    title: 'Запрос в суд на предоставление доступа к документам по процессу',
    shortTitle: 'Запрос в суд',
    docxFile: 'Запрос в суд на предоставления доступа к документам по процессу.docx',
    requiredFields: ['courtName', 'debtorFullName']
  },
  {
    key: 'state-agencies',
    title: 'Запрос в государственные органы',
    shortTitle: 'Запрос в ГО',
    docxFile: 'Запрос в гос органы (30.03.2026).docx',
    requiredFields: ['debtorFullName', 'debtorIin', 'registrationAddress']
  },
  {
    key: 'financial-organizations',
    title: 'Запрос в БВУ РК и другие финансовые организации',
    shortTitle: 'Запрос в БВУ',
    docxFile: 'Запрос в БВУ РК и другие фин.оргн..docx',
    requiredFields: ['debtorFullName', 'debtorIin']
  },
  {
    key: 'dgd-letter',
    title: 'Письмо в ДГД на подачу объявления',
    shortTitle: 'Письмо в ДГД',
    docxFile: 'Письмо в ДГД на подачу объявления каз и рус языках.docx',
    requiredFields: ['dgd', 'courtName', 'courtDecisionDate', 'debtorFullName', 'debtorIin']
  },
  {
    key: 'debtor-documents',
    title: 'Запрос документов от должника',
    shortTitle: 'Запрос должнику',
    docxFile: 'Запрос документов от должника.docx',
    requiredFields: ['debtorFullName', 'debtorIin']
  }
];

function formatDate(date) {
  return date ? dayjs(date).format('DD.MM.YYYY') : '';
}

function formatLongRuDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
}

function valueOrPlaceholder(value, label) {
  return value || `[Заполните поле: ${label}]`;
}

function buildReplacements(caseRecord) {
  const generatedDate = dayjs().format('YYYY-MM-DD');
  const debtorIdentity = `${valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')}, ИИН ${valueOrPlaceholder(caseRecord.debtorIin, 'ИИН')}`;

  return [
    ['11.04.2026', formatDate(generatedDate)],
    ['10.02.2026', formatDate(caseRecord.courtDecisionDate)],
    ['30.03.2026', formatDate(generatedDate)],
    ['11 апреля 2026 года', `${formatLongRuDate(generatedDate)} года`],
    ['ФИО Иванов Ивано Иванович, ИИН 123 123 456 456', `ФИО ${debtorIdentity}`],
    ['ФИО Иванов Ивано Иванович, ИИН 123 123 456 456', `ФИО ${debtorIdentity}`],
    ['ФИО должника: ______________________', `ФИО должника: ${valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')}`],
    ['ИИН: __________________________', `ИИН: ${valueOrPlaceholder(caseRecord.debtorIin, 'ИИН')}`],
    ['Адрес регистрации: ________________', `Адрес регистрации: ${valueOrPlaceholder(caseRecord.registrationAddress, 'Адрес регистрации')}`],
    ['Наименование суда', valueOrPlaceholder(caseRecord.courtName, 'Наименование суда')],
    ['______________________________ ', `${valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')} `],
    ['Наименование должника', valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')],
    ['Байрамова Ширина Хасай оглы, ИИН 610225300229.', `${debtorIdentity}.`],
    ['Атбасарского районного суда Акмолинской области', valueOrPlaceholder(caseRecord.courtName, 'Наименование суда')],
    ['Акмолинской области', valueOrPlaceholder(caseRecord.dgd, 'ДГД')],
    ['Акмола облысы', valueOrPlaceholder(caseRecord.dgd, 'ДГД')],
    ['Акмола облысы Атбасар аудандық сотының ', `${valueOrPlaceholder(caseRecord.courtName, 'Наименование суда')} `],
    ['Ақмола облысы Атбасар аудандық сотының ', `${valueOrPlaceholder(caseRecord.courtName, 'Наименование суда')} `],
    ['Иванов Ивано Иванович', valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')],
    ['123 123 456 456', valueOrPlaceholder(caseRecord.debtorIin, 'ИИН')],
    ['123 123 456 456', valueOrPlaceholder(caseRecord.debtorIin, 'ИИН')]
  ];
}

function applyTextReplacements(content, replacements) {
  let result = content;
  for (const [from, to] of replacements) {
    result = result.split(from).join(to);
  }
  return result;
}

function paragraphExactReplacements(caseRecord) {
  return new Map([
    ['ФИО Иванов Ивано Иванович, ИИН 123 123 456 456', `ФИО ${valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')}, ИИН ${valueOrPlaceholder(caseRecord.debtorIin, 'ИИН')}`],
    ['ФИО Иванов Ивано Иванович, ИИН 123 123 456 456', `ФИО ${valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')}, ИИН ${valueOrPlaceholder(caseRecord.debtorIin, 'ИИН')}`],
    ['ФИО должника: ______________________', `ФИО должника: ${valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')}`],
    ['ИИН: __________________________', `ИИН: ${valueOrPlaceholder(caseRecord.debtorIin, 'ИИН')}`],
    ['Адрес регистрации: ________________', `Адрес регистрации: ${valueOrPlaceholder(caseRecord.registrationAddress, 'Адрес регистрации')}`],
    ['Наименование суда', valueOrPlaceholder(caseRecord.courtName, 'Наименование суда')],
    ['Наименование должника', valueOrPlaceholder(caseRecord.debtorFullName, 'ФИО должника')],
    ['ИИН', valueOrPlaceholder(caseRecord.debtorIin, 'ИИН')]
  ]);
}

function getTextNodes(node, acc = []) {
  if (!node) return acc;
  if (node.nodeName === 'w:t') acc.push(node);
  for (let index = 0; index < (node.childNodes?.length || 0); index += 1) {
    getTextNodes(node.childNodes[index], acc);
  }
  return acc;
}

function getRunTexts(paragraphNode) {
  const runs = [];
  for (let index = 0; index < (paragraphNode.childNodes?.length || 0); index += 1) {
    const child = paragraphNode.childNodes[index];
    if (child.nodeName === 'w:r') {
      const textNodes = getTextNodes(child);
      const text = textNodes.map((node) => node.textContent || '').join('');
      runs.push({ run: child, textNodes, text });
    }
  }
  return runs;
}

function clearRunHighlights(runNode) {
  for (let index = (runNode.childNodes?.length || 0) - 1; index >= 0; index -= 1) {
    const child = runNode.childNodes[index];
    if (child.nodeName === 'w:rPr') {
      for (let propIndex = child.childNodes.length - 1; propIndex >= 0; propIndex -= 1) {
        const prop = child.childNodes[propIndex];
        if (prop.nodeName === 'w:highlight' || prop.nodeName === 'w:shd') {
          child.removeChild(prop);
        }
      }
      if (!child.childNodes.length) {
        runNode.removeChild(child);
      }
    }
  }
}

function applyXmlParagraphReplacements(xmlContent, caseRecord) {
  const doc = new DOMParser().parseFromString(xmlContent, 'text/xml');
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  const exactMap = paragraphExactReplacements(caseRecord);
  const replacements = buildReplacements(caseRecord);

  for (const paragraph of paragraphs) {
    const runs = getRunTexts(paragraph);
    const paragraphText = runs.map((item) => item.text).join('').trim();
    const exactReplacement = exactMap.get(paragraphText);

    if (exactReplacement) {
      let firstAssigned = false;
      for (const item of runs) {
        clearRunHighlights(item.run);
        for (const textNode of item.textNodes) {
          if (!firstAssigned) {
            textNode.textContent = exactReplacement;
            firstAssigned = true;
          } else {
            textNode.textContent = '';
          }
        }
      }
      continue;
    }

    for (const item of runs) {
      clearRunHighlights(item.run);
      for (const textNode of item.textNodes) {
        let value = textNode.textContent || '';
        for (const [from, to] of replacements) {
          value = value.split(from).join(to);
        }
        textNode.textContent = value;
      }
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function buildDownloadName(caseRecord, template, extension) {
  return `${caseRecord.debtorFullName || 'должник'} - ${template.shortTitle}.${extension}`;
}

function runLibreOfficePdfConversion(sourcePath, outputDir) {
  return new Promise((resolve, reject) => {
    const binary = process.env.LIBREOFFICE_BIN || 'libreoffice';
    const child = spawn(binary, ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, sourcePath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr || stdout || `LibreOffice PDF conversion failed with code ${code}`));
    });
  });
}

export async function listCaseDocuments(caseId) {
  const caseRecord = await getCase(caseId);
  if (!caseRecord) return null;

  return TEMPLATE_DEFINITIONS.map((template) => ({
    key: template.key,
    title: template.title,
    shortTitle: template.shortTitle,
    requiredFields: template.requiredFields,
    missingFields: template.requiredFields.filter((field) => !caseRecord[field]),
    generatedDocxUrl: `/api/cases/${caseId}/documents/${template.key}/download.docx`,
    generatedPdfUrl: `/api/cases/${caseId}/documents/${template.key}/download.pdf`
  }));
}

export async function generateDocx(caseId, templateKey) {
  const caseRecord = await getCase(caseId);
  if (!caseRecord) return null;
  const template = TEMPLATE_DEFINITIONS.find((item) => item.key === templateKey);
  if (!template) return null;

  const templatePath = path.join(templatesDir, template.docxFile);
  const zip = await JSZip.loadAsync(await fs.readFile(templatePath));
  const replacements = buildReplacements(caseRecord);
  const xmlFiles = Object.keys(zip.files).filter((name) => name.startsWith('word/') && name.endsWith('.xml'));

  for (const fileName of xmlFiles) {
    const content = await zip.file(fileName).async('string');
    const updated = applyXmlParagraphReplacements(applyTextReplacements(content, replacements), caseRecord);
    zip.file(fileName, updated);
  }

  return {
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    downloadName: buildDownloadName(caseRecord, template, 'docx')
  };
}

export async function generatePdf(caseId, templateKey) {
  const caseRecord = await getCase(caseId);
  if (!caseRecord) return null;
  const template = TEMPLATE_DEFINITIONS.find((item) => item.key === templateKey);
  if (!template) return null;

  const generatedDocx = await generateDocx(caseId, templateKey);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'abzal-crm-doc-'));
  const docxPath = path.join(tempDir, 'source.docx');
  const pdfPath = path.join(tempDir, 'source.pdf');

  try {
    await fs.writeFile(docxPath, generatedDocx.buffer);
    await runLibreOfficePdfConversion(docxPath, tempDir);
    return {
      buffer: await fs.readFile(pdfPath),
      downloadName: buildDownloadName(caseRecord, template, 'pdf')
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
