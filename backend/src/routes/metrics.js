import express from 'express';

const router = express.Router();

// In-memory metrics store for client-reported frame timings
const metricsStore = {
  frameBudgetExceedances: 0,
  clientInferences: 0,
  avgInferenceLatencyMs: 0,
  recentClientReports: [],
};

// POST /api/metrics - client sends device-side performance telemetry
router.post('/', (req, res) => {
  const { frameBudgetExceeded, inferenceLatencyMs, fps, deviceId } = req.body;

  if (frameBudgetExceeded) {
    metricsStore.frameBudgetExceedances++;
  }

  if (typeof inferenceLatencyMs === 'number') {
    metricsStore.clientInferences++;
    metricsStore.avgInferenceLatencyMs =
      (metricsStore.avgInferenceLatencyMs * (metricsStore.clientInferences - 1) + inferenceLatencyMs) /
      metricsStore.clientInferences;
  }

  metricsStore.recentClientReports.unshift({
    timestamp: new Date().toISOString(),
    deviceId: deviceId || 'unknown',
    fps: fps || 30,
    latencyMs: inferenceLatencyMs || 0,
    exceeded: Boolean(frameBudgetExceeded),
  });

  if (metricsStore.recentClientReports.length > 100) {
    metricsStore.recentClientReports.pop();
  }

  return res.status(200).json({ status: 'ok' });
});

// GET /metrics - Prometheus format / JSON telemetry
router.get('/', (req, res) => {
  const format = req.headers.accept?.includes('application/json') ? 'json' : 'prometheus';

  if (format === 'json') {
    return res.json({
      uptimeSeconds: Math.floor(process.uptime()),
      ...metricsStore,
    });
  }

  // Prometheus exposition format
  const prometheusBody = `
# HELP verity_device_frame_budget_exceedances Total count of client frame-budget overruns
# TYPE verity_device_frame_budget_exceedances counter
verity_device_frame_budget_exceedances ${metricsStore.frameBudgetExceedances}

# HELP verity_client_inferences_total Total face recognition inferences recorded from clients
# TYPE verity_client_inferences_total counter
verity_client_inferences_total ${metricsStore.clientInferences}

# HELP verity_client_avg_inference_latency_ms Average client MobileFaceNet inference latency in ms
# TYPE verity_client_avg_inference_latency_ms gauge
verity_client_avg_inference_latency_ms ${metricsStore.avgInferenceLatencyMs.toFixed(2)}

# HELP verity_process_uptime_seconds Backend process uptime
# TYPE verity_process_uptime_seconds counter
verity_process_uptime_seconds ${Math.floor(process.uptime())}
`.trim();

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  return res.send(prometheusBody);
});

export default router;
