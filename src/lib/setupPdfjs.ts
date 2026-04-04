import { GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

/**
 * Must run before any pdf.js API usage. Resolves the worker bundle via Vite.
 */
GlobalWorkerOptions.workerSrc = pdfWorkerUrl
