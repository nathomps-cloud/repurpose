// pages/index.js
// Serves the landing page from /public/index.html
// Or redirect to the static HTML file

export default function Home() {
  return null;
}

export async function getServerSideProps({ res }) {
  res.writeHead(302, { Location: '/index.html' });
  res.end();
  return { props: {} };
}
