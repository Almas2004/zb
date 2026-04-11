import express from 'express';
import {
  createCase,
  deleteCase,
  getDashboardStats,
  getCase,
  getDictionaries,
  listCases,
  updateCase
} from '../casesService.js';
import { generateDocx, generatePdf, listCaseDocuments } from '../documentsService.js';
import { caseSchema } from '../validators.js';

export const casesRouter = express.Router();

function setDownloadHeaders(res, contentType, fileName) {
  const asciiFallback = 'document';
  const encoded = encodeURIComponent(fileName);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`);
}

casesRouter.get('/dictionaries', async (_req, res, next) => {
  try {
    res.json(await getDictionaries());
  } catch (error) {
    next(error);
  }
});

casesRouter.get('/dashboard', async (_req, res, next) => {
  try {
    res.json(await getDashboardStats());
  } catch (error) {
    next(error);
  }
});

casesRouter.get('/:id/documents', async (req, res, next) => {
  try {
    const documents = await listCaseDocuments(req.params.id);
    if (!documents) return res.status(404).json({ message: 'Запись не найдена' });
    return res.json(documents);
  } catch (error) {
    return next(error);
  }
});

casesRouter.get('/:id/documents/:templateKey/download.docx', async (req, res, next) => {
  try {
    const generated = await generateDocx(req.params.id, req.params.templateKey);
    if (!generated) return res.status(404).json({ message: 'Документ не найден' });
    setDownloadHeaders(res, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', generated.downloadName);
    return res.send(generated.buffer);
  } catch (error) {
    return next(error);
  }
});

casesRouter.get('/:id/documents/:templateKey/download.pdf', async (req, res, next) => {
  try {
    const generated = await generatePdf(req.params.id, req.params.templateKey);
    if (!generated) return res.status(404).json({ message: 'Документ не найден' });
    setDownloadHeaders(res, 'application/pdf', generated.downloadName);
    return res.send(generated.buffer);
  } catch (error) {
    return next(error);
  }
});

casesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listCases(req.query));
  } catch (error) {
    next(error);
  }
});

casesRouter.post('/', async (req, res, next) => {
  try {
    const payload = caseSchema.parse(req.body);
    res.status(201).json(await createCase(payload));
  } catch (error) {
    next(error);
  }
});

casesRouter.get('/:id', async (req, res, next) => {
  try {
    const record = await getCase(req.params.id);
    if (!record) return res.status(404).json({ message: 'Запись не найдена' });
    return res.json(record);
  } catch (error) {
    return next(error);
  }
});

casesRouter.put('/:id', async (req, res, next) => {
  try {
    const payload = caseSchema.parse(req.body);
    const record = await updateCase(req.params.id, payload);
    if (!record) return res.status(404).json({ message: 'Запись не найдена' });
    return res.json(record);
  } catch (error) {
    return next(error);
  }
});

casesRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteCase(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Запись не найдена' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
