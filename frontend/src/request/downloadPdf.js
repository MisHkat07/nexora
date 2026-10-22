import { BASE_URL } from '@/config/serverApiConfig';
import request from './request';

// PDFs are behind a short-lived signed link: ask the API for one, then let the browser download it
export default async function downloadPdf({ entity, id }) {
  const response = await request.get({ entity: `${entity}/download-link/${id}` });
  if (!response?.success) return;

  const link = document.createElement('a');
  link.href = BASE_URL + response.result.url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
