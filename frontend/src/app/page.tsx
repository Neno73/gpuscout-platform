import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            GPUScout Platform
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            AI-powered analytics platform for GPU hosts to optimize revenue through data-driven insights
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Market Intelligence</CardTitle>
              <CardDescription>
                Real-time GPU market data with pricing analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                • RTX 4090 leads market (36% share)
                • $0.26-$1.75/hr price range
                • Live availability tracking
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Geographic Analytics</CardTitle>
              <CardDescription>
                Provider distribution and regional insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                • US dominates (1,620 TFLOPS)
                • 4 countries analyzed
                • Regional performance metrics
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Performance Optimization</CardTitle>
              <CardDescription>
                Value analysis and efficiency metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                • RTX 4090 best value (490 DLPERF/$)
                • Multi-dimensional comparisons
                • Real-time efficiency tracking
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-8 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}