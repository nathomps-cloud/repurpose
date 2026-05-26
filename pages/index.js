// pages/index.js
// Serves the landing page from /public/index.html
// Injects the Stripe publishable key from env at request time so it's never hardcoded

import fs from 'fs';
import path from 'path';

export default function Home() {
  return null;
}

export async function getServerSideProps({ res }) {
  const htmlPath = path.join(process.cwd(), 'public', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');

  // Inject Stripe key from env var into the page so the static HTML
  // never needs to contain the real key
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const injection = `<script>window.__STRIPE_KEY__ = ${JSON.stringify(stripeKey)};</script>`;
  html = html.replace('<head>', `<head>\n  ${injection}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.write(html);
  res.end();

  return { props: {} };
}
