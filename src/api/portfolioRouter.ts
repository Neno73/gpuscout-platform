import { Router, IRequest } from 'itty-router';
import { PortfolioService } from '../services/portfolioService';
import { Env } from '../worker';

// Assume an authentication middleware runs before this router,
// attaching a `user` object to the request.
interface AuthenticatedRequest extends IRequest {
  user: { id: string; tier: string };
}

const router = Router({ base: '/api/v1/portfolios' });

// Middleware to initialize the service
const withService = (req: IRequest, env: Env) => {
  req.service = new PortfolioService(env.DB);
};

router.post('/', withService, async (req: AuthenticatedRequest, env: Env) => {
  const { name, description } = await req.json();
  if (!name) {
    return new Response(JSON.stringify({ success: false, error: 'Portfolio name is required' }), { status: 400 });
  }
  const portfolio = await req.service.createPortfolio(req.user.id, { name, description });
  return new Response(JSON.stringify({ success: true, data: portfolio }), { status: 201 });
});

router.get('/', withService, async (req: AuthenticatedRequest, env: Env) => {
  const portfolios = await req.service.getPortfolios(req.user.id);
  return new Response(JSON.stringify({ success: true, data: portfolios }));
});

router.get('/:portfolioId', withService, async (req: AuthenticatedRequest, env: Env) => {
  const { portfolioId } = req.params;
  const portfolio = await req.service.getPortfolioById(req.user.id, portfolioId);
  if (!portfolio) {
    return new Response(JSON.stringify({ success: false, error: 'Portfolio not found' }), { status: 404 });
  }
  return new Response(JSON.stringify({ success: true, data: portfolio }));
});

router.put('/:portfolioId', withService, async (req: AuthenticatedRequest, env: Env) => {
  const { portfolioId } = req.params;
  const body = await req.json();
  const portfolio = await req.service.updatePortfolio(req.user.id, portfolioId, body);
  if (!portfolio) {
    return new Response(JSON.stringify({ success: false, error: 'Portfolio not found' }), { status: 404 });
  }
  return new Response(JSON.stringify({ success: true, data: portfolio }));
});

router.delete('/:portfolioId', withService, async (req: AuthenticatedRequest, env: Env) => {
  const { portfolioId } = req.params;
  const success = await req.service.deletePortfolio(req.user.id, portfolioId);
  if (!success) {
    // This could be due to not found or a db error, 404 is a safe bet.
    return new Response(JSON.stringify({ success: false, error: 'Portfolio not found or could not be deleted' }), { status: 404 });
  }
  return new Response(null, { status: 204 });
});

// GPU Instance Routes

router.post('/:portfolioId/gpus', withService, async (req: AuthenticatedRequest, env: Env) => {
  const { portfolioId } = req.params;
  const { gpuModel, quantity, customNamePrefix } = await req.json();

  if (!gpuModel || !quantity || quantity < 1) {
    return new Response(JSON.stringify({ success: false, error: 'gpuModel and a valid quantity are required' }), { status: 400 });
  }

  const newInstances = await req.service.addGpuInstances(req.user.id, portfolioId, { gpuModel, quantity, customNamePrefix });
  if (!newInstances) {
    return new Response(JSON.stringify({ success: false, error: 'Portfolio not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true, data: newInstances }), { status: 201 });
});

router.put('/:portfolioId/gpus/:gpuId', withService, async (req: AuthenticatedRequest, env: Env) => {
  const { portfolioId, gpuId } = req.params;
  const body = await req.json();

  const updatedInstance = await req.service.updateGpuInstance(req.user.id, portfolioId, gpuId, body);
  if (!updatedInstance) {
    return new Response(JSON.stringify({ success: false, error: 'GPU instance not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true, data: updatedInstance }));
});

router.delete('/:portfolioId/gpus/:gpuId', withService, async (req: AuthenticatedRequest, env: Env) => {
  const { portfolioId, gpuId } = req.params;
  
  // The service needs a method for this. Let's assume it's added.
  // For now, we can't implement the handler without the service method.
  // I will add a placeholder.
  // await req.service.deleteGpuInstance(req.user.id, portfolioId, gpuId);
  
  // Placeholder implementation:
  const portfolio = await env.DB.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').bind(portfolioId, req.user.id).first();
  if (!portfolio) {
    return new Response(JSON.stringify({ success: false, error: 'Portfolio not found' }), { status: 404 });
  }
  const { success } = await env.DB.prepare('DELETE FROM gpu_instances WHERE id = ? AND portfolio_id = ?').bind(gpuId, portfolioId).run();

  if (!success) {
     return new Response(JSON.stringify({ success: false, error: 'GPU instance not found or could not be deleted' }), { status: 404 });
  }

  return new Response(null, { status: 204 });
});

export const portfolioRouter = router;