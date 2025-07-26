import PortfolioDetailClient from './PortfolioDetailClient';

interface PortfolioDetailPageProps {
  params: { id: string };
}

// Required for static export with dynamic routes
export async function generateStaticParams() {
  return [];
}

export default function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  return <PortfolioDetailClient params={params} />;
}