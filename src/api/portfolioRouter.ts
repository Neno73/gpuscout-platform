import { PortfolioService } from '../services/portfolioService';
import { Env } from '../worker';

// Since we removed authentication, we'll use a default user ID
const DEFAULT_USER_ID = 'anonymous';

// Portfolio handler function for the main worker
export async function portfolioHandler(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/portfolios', '');
  const method = request.method;

  const service = new PortfolioService(env.DB);

  try {
    // Parse path segments
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      // /api/portfolios/
      if (method === 'POST') {
        return await createPortfolio(request, service);
      } else if (method === 'GET') {
        return await getPortfolios(service);
      }
    } else if (segments.length === 1) {
      // /api/portfolios/:portfolioId
      const portfolioId = segments[0];
      if (method === 'GET') {
        return await getPortfolioById(service, portfolioId);
      } else if (method === 'PUT') {
        return await updatePortfolio(request, service, portfolioId);
      } else if (method === 'DELETE') {
        return await deletePortfolio(service, portfolioId);
      }
    } else if (segments.length === 2 && segments[1] === 'gpus') {
      // /api/portfolios/:portfolioId/gpus
      const portfolioId = segments[0];
      if (method === 'POST') {
        return await addGpuInstances(request, service, portfolioId);
      }
    } else if (segments.length === 3 && segments[1] === 'gpus') {
      // /api/portfolios/:portfolioId/gpus/:gpuId
      const portfolioId = segments[0];
      const gpuId = segments[2];
      if (method === 'PUT') {
        return await updateGpuInstance(request, service, portfolioId, gpuId);
      } else if (method === 'DELETE') {
        return await deleteGpuInstance(env, portfolioId, gpuId);
      }
    } else if (segments.length === 1 && segments[0] === 'marketplace-offers') {
      // /api/portfolios/marketplace-offers
      if (method === 'GET') {
        return await getMarketplaceOffers(env);
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Not Found',
      message: 'Portfolio endpoint not found'
    }), { status: 404 });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}

// Handler functions
async function createPortfolio(request: Request, service: PortfolioService): Promise<Response> {
  const { name, description } = await request.json();
  if (!name) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Portfolio name is required' 
    }), { status: 400 });
  }
  
  const portfolio = await service.createPortfolio(DEFAULT_USER_ID, { name, description });
  return new Response(JSON.stringify({ 
    success: true, 
    data: portfolio 
  }), { status: 201 });
}

async function getPortfolios(service: PortfolioService): Promise<Response> {
  const portfolios = await service.getPortfolios(DEFAULT_USER_ID);
  return new Response(JSON.stringify({ 
    success: true, 
    data: portfolios 
  }));
}

async function getPortfolioById(service: PortfolioService, portfolioId: string): Promise<Response> {
  const portfolio = await service.getPortfolioById(DEFAULT_USER_ID, portfolioId);
  if (!portfolio) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Portfolio not found' 
    }), { status: 404 });
  }
  return new Response(JSON.stringify({ 
    success: true, 
    data: portfolio 
  }));
}

async function updatePortfolio(request: Request, service: PortfolioService, portfolioId: string): Promise<Response> {
  const body = await request.json();
  const portfolio = await service.updatePortfolio(DEFAULT_USER_ID, portfolioId, body);
  if (!portfolio) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Portfolio not found' 
    }), { status: 404 });
  }
  return new Response(JSON.stringify({ 
    success: true, 
    data: portfolio 
  }));
}

async function deletePortfolio(service: PortfolioService, portfolioId: string): Promise<Response> {
  const success = await service.deletePortfolio(DEFAULT_USER_ID, portfolioId);
  if (!success) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Portfolio not found or could not be deleted' 
    }), { status: 404 });
  }
  return new Response(null, { status: 204 });
}

async function addGpuInstances(request: Request, service: PortfolioService, portfolioId: string): Promise<Response> {
  const { offerIds, customName } = await request.json();

  if (!offerIds || !Array.isArray(offerIds) || offerIds.length === 0) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'offerIds array is required and must not be empty' 
    }), { status: 400 });
  }

  const newInstances = await service.addMarketplaceOffers(DEFAULT_USER_ID, portfolioId, { 
    offerIds, 
    customName 
  });
  
  if (!newInstances) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Portfolio not found or offers invalid' 
    }), { status: 404 });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    data: newInstances 
  }), { status: 201 });
}

async function updateGpuInstance(request: Request, service: PortfolioService, portfolioId: string, gpuId: string): Promise<Response> {
  const body = await request.json();
  const updatedInstance = await service.updateGpuInstance(DEFAULT_USER_ID, portfolioId, gpuId, body);
  
  if (!updatedInstance) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'GPU instance not found' 
    }), { status: 404 });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    data: updatedInstance 
  }));
}

async function deleteGpuInstance(env: Env, portfolioId: string, gpuId: string): Promise<Response> {
  // Check if portfolio exists for the default user
  const portfolio = await env.DB.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?')
    .bind(portfolioId, DEFAULT_USER_ID).first();
  
  if (!portfolio) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Portfolio not found' 
    }), { status: 404 });
  }
  
  const { success } = await env.DB.prepare('DELETE FROM gpu_instances WHERE id = ? AND portfolio_id = ?')
    .bind(gpuId, portfolioId).run();

  if (!success) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'GPU instance not found or could not be deleted' 
    }), { status: 404 });
  }

  return new Response(null, { status: 204 });
}

async function getMarketplaceOffers(env: Env): Promise<Response> {
  try {
    const stmt = env.DB.prepare(`
      SELECT 
        offer_id,
        gpu_name,
        num_gpus,
        price_base_per_hour,
        dlperf,
        dlperf_per_dollar,
        reliability_score,
        country,
        location,
        rentable,
        verified
      FROM gpu_marketplace_offers 
      WHERE rentable = 1 AND verified = 1
      ORDER BY dlperf_per_dollar DESC
      LIMIT 50
    `);
    
    const { results: offers } = await stmt.all();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: offers 
    }));
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch marketplace offers',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}

