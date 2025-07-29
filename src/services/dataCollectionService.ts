/**
 * Data Collection Service for 500.farm API
 * Handles large dataset collection using chunked/streaming approaches
 */

interface DataCollectionConfig {
  maxRetries: number;
  chunkSize: number;
  delayBetweenRequests: number;
  timeout: number;
}

interface CollectionResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  duration: number;
  lastProcessedId?: string;
}

const DEFAULT_CONFIG: DataCollectionConfig = {
  maxRetries: 3,
  chunkSize: 1000, // Process in chunks of 1000 records
  delayBetweenRequests: 1000, // 1 second between requests
  timeout: 30000 // 30 seconds per request
};

export class DataCollectionService {
  private config: DataCollectionConfig;
  private env: any;

  constructor(env: any, config: Partial<DataCollectionConfig> = {}) {
    this.env = env;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Strategy for collecting large datasets from 500.farm
   * Uses a multi-approach strategy to handle >10MB responses
   */
  async collectLargeDataset(endpoint: string, syncJobId: string): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      // Update sync job status
      await this.updateSyncJob(syncJobId, 'running', 0);

      // Strategy 1: Try direct fetch with streaming (if supported)
      const streamResult = await this.tryStreamingApproach(endpoint);
      if (streamResult.success) {
        recordsProcessed += await this.processStreamedData(streamResult.data, endpoint);
        await this.updateSyncJob(syncJobId, 'completed', recordsProcessed);
        return {
          success: true,
          recordsProcessed,
          errors,
          duration: Date.now() - startTime
        };
      }

      // Strategy 2: Try HEAD request to check if pagination is supported
      const paginationResult = await this.tryPaginationApproach(endpoint);
      if (paginationResult.success) {
        recordsProcessed += await this.processPaginatedData(endpoint, syncJobId);
        await this.updateSyncJob(syncJobId, 'completed', recordsProcessed);
        return {
          success: true,
          recordsProcessed,
          errors,
          duration: Date.now() - startTime
        };
      }

      // Strategy 3: Try partial content ranges (HTTP Range requests)
      const rangeResult = await this.tryRangeRequestApproach(endpoint);
      if (rangeResult.success) {
        recordsProcessed += await this.processRangeData(endpoint, syncJobId);
        await this.updateSyncJob(syncJobId, 'completed', recordsProcessed);
        return {
          success: true,
          recordsProcessed,
          errors,
          duration: Date.now() - startTime
        };
      }

      // Strategy 4: External processing via Cloudflare Worker with larger limits
      const externalResult = await this.tryExternalProcessing(endpoint, syncJobId);
      if (externalResult.success) {
        recordsProcessed = externalResult.recordsProcessed;
        await this.updateSyncJob(syncJobId, 'completed', recordsProcessed);
        return {
          success: true,
          recordsProcessed,
          errors,
          duration: Date.now() - startTime
        };
      }

      // All strategies failed
      await this.updateSyncJob(syncJobId, 'failed', recordsProcessed, 'All collection strategies failed');
      return {
        success: false,
        recordsProcessed,
        errors: ['All collection strategies failed'],
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      await this.updateSyncJob(syncJobId, 'failed', recordsProcessed, errorMsg);
      
      return {
        success: false,
        recordsProcessed,
        errors,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Strategy 1: Try streaming approach with fetch
   */
  private async tryStreamingApproach(endpoint: string): Promise<{ success: boolean; data?: any }> {
    try {
      const url = `https://500.farm/vastai-exporter/${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        }
      });

      if (!response.ok) {
        return { success: false };
      }

      // Check if response is streamable
      if (response.body && response.body.getReader) {
        return { success: true, data: response.body };
      }

      return { success: false };
    } catch (error) {
      console.error('Streaming approach failed:', error);
      return { success: false };
    }
  }

  /**
   * Strategy 2: Try pagination approach
   */
  private async tryPaginationApproach(endpoint: string): Promise<{ success: boolean }> {
    try {
      const url = `https://500.farm/vastai-exporter/${endpoint}?limit=1&page=1`;
      const response = await fetch(url, { method: 'HEAD' });
      
      // If HEAD request succeeds and has pagination headers, pagination is supported
      const totalPages = response.headers.get('X-Total-Pages');
      const totalRecords = response.headers.get('X-Total-Count');
      
      return { success: !!(totalPages || totalRecords) };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Strategy 3: Try HTTP Range requests
   */
  private async tryRangeRequestApproach(endpoint: string): Promise<{ success: boolean }> {
    try {
      const url = `https://500.farm/vastai-exporter/${endpoint}`;
      const response = await fetch(url, {
        method: 'HEAD'
      });
      
      // Check if server supports range requests
      const acceptRanges = response.headers.get('Accept-Ranges');
      return { success: acceptRanges === 'bytes' };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Strategy 4: External processing via separate Worker or service
   */
  private async tryExternalProcessing(endpoint: string, syncJobId: string): Promise<{ success: boolean; recordsProcessed: number }> {
    try {
      // This would call a separate Cloudflare Worker or external service
      // that has higher memory/processing limits
      console.log(`External processing not implemented for ${endpoint}, sync job ${syncJobId}`);
      return { success: false, recordsProcessed: 0 };
    } catch (error) {
      return { success: false, recordsProcessed: 0 };
    }
  }

  /**
   * Process streamed data in chunks
   */
  private async processStreamedData(stream: ReadableStream, endpoint: string): Promise<number> {
    let recordsProcessed = 0;
    const reader = stream.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert chunk to string and append to buffer
        const chunk = new TextDecoder().decode(value);
        buffer += chunk;

        // Process complete JSON objects from buffer
        const processedCount = await this.processBufferChunk(buffer, endpoint);
        recordsProcessed += processedCount;

        // Clear processed data from buffer (implementation depends on data format)
        buffer = this.cleanBuffer(buffer);
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        recordsProcessed += await this.processBufferChunk(buffer, endpoint);
      }

    } finally {
      reader.releaseLock();
    }

    return recordsProcessed;
  }

  /**
   * Process paginated data
   */
  private async processPaginatedData(endpoint: string, syncJobId: string): Promise<number> {
    let recordsProcessed = 0;
    let page = 1;
    const limit = this.config.chunkSize;

    while (true) {
      try {
        const url = `https://500.farm/vastai-exporter/${endpoint}?limit=${limit}&page=${page}`;
        const response = await fetch(url, { 
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          if (response.status === 404) {
            // No more pages
            break;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
          // No more data
          break;
        }

        // Process this page of data
        const processed = await this.processDataChunk(data, endpoint);
        recordsProcessed += processed;

        // Update sync job progress
        await this.updateSyncJob(syncJobId, 'running', recordsProcessed);

        // If we got less than the limit, we're done
        if (Array.isArray(data) && data.length < limit) {
          break;
        }

        page++;
        
        // Rate limiting delay
        await this.delay(this.config.delayBetweenRequests);

      } catch (error) {
        console.error(`Error processing page ${page}:`, error);
        break;
      }
    }

    return recordsProcessed;
  }

  /**
   * Process data using HTTP Range requests
   */
  private async processRangeData(endpoint: string, syncJobId: string): Promise<number> {
    let recordsProcessed = 0;
    let startByte = 0;
    const chunkSize = 1024 * 1024; // 1MB chunks

    while (true) {
      try {
        const endByte = startByte + chunkSize - 1;
        const url = `https://500.farm/vastai-exporter/${endpoint}`;
        
        const response = await fetch(url, {
          headers: {
            'Range': `bytes=${startByte}-${endByte}`
          },
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (response.status === 416) {
          // Range not satisfiable - we're done
          break;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const chunk = await response.text();
        
        // Process this chunk
        const processed = await this.processBufferChunk(chunk, endpoint);
        recordsProcessed += processed;

        // Update progress
        await this.updateSyncJob(syncJobId, 'running', recordsProcessed);

        startByte = endByte + 1;
        
        // Rate limiting delay
        await this.delay(this.config.delayBetweenRequests);

      } catch (error) {
        console.error(`Error processing range ${startByte}:`, error);
        break;
      }
    }

    return recordsProcessed;
  }

  /**
   * Process a chunk of data and store in database
   */
  private async processDataChunk(data: any, endpoint: string): Promise<number> {
    if (!Array.isArray(data)) {
      data = [data];
    }

    let processed = 0;

    for (const item of data) {
      try {
        switch (endpoint) {
          case 'offers':
            await this.storeOffer(item);
            break;
          case 'machines':
            await this.storeMachine(item);
            break;
          case 'hosts':
            await this.storeHost(item);
            break;
        }
        processed++;
      } catch (error) {
        console.error(`Error storing ${endpoint} item:`, error);
      }
    }

    return processed;
  }

  /**
   * Process buffer chunk for streaming data
   */
  private async processBufferChunk(buffer: string, endpoint: string): Promise<number> {
    // Implementation depends on the specific format of 500.farm data
    // This is a simplified version - actual implementation would need to handle
    // partial JSON objects, arrays, etc.
    
    try {
      // Try to parse as JSON array
      const data = JSON.parse(buffer);
      return await this.processDataChunk(data, endpoint);
    } catch (error) {
      // If parse fails, might be partial data - return 0 for now
      return 0;
    }
  }

  /**
   * Clean processed data from buffer
   */
  private cleanBuffer(buffer: string): string {
    // Simplified implementation - would need more sophisticated logic
    // to handle partial JSON objects properly
    return buffer;
  }

  /**
   * Store GPU offer in database - Updated for real 500.farm offers structure
   */
  private async storeOffer(offer: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    try {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO gpu_offers 
        (id, bundle_id, machine_id, host_id,
         gpu_name, gpu_ram, gpu_total_ram, num_gpus, gpu_arch, compute_cap,
         gpu_max_power, gpu_max_temp, gpu_mem_bw, gpu_lanes, pci_gen, pcie_bw,
         cpu_name, cpu_cores, cpu_cores_effective, cpu_ghz, cpu_ram, cpu_arch, has_avx,
         disk_name, disk_space, disk_bw,
         dph_base, dph_total_adj, discounted_dph_total, min_bid, storage_cost, vram_costperhour,
         inet_down, inet_up, inet_down_cost, inet_up_cost, internet_down_cost_per_tb, internet_up_cost_per_tb,
         dlperf, dlperf_per_dphtotal, flops_per_dphtotal, total_flops, score,
         reliability, reliability2, reliability_mult, verification, verified, expected_reliability,
         geolocation, geolocode, public_ipaddr, static_ip, direct_port_count,
         os_version, driver_version, driver_vers, cuda_max_good, mobo_name,
         rentable, start_date, end_date, duration, time_remaining,
         vms_enabled, is_vm_deverified,
         hosting_type, resource_type, discount_rate, credit_discount_max,
         data_timestamp, updated_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        offer.ask_contract_id || offer.id,
        offer.bundle_id || null,
        offer.machine_id || null,
        offer.host_id || null,
        
        // GPU specs
        offer.gpu_name || 'unknown',
        offer.gpu_ram || null,
        offer.gpu_total_ram || null,
        offer.num_gpus || 1,
        offer.gpu_arch || null,
        offer.compute_cap || null,
        offer.gpu_max_power || null,
        offer.gpu_max_temp || null,
        offer.gpu_mem_bw || null,
        offer.gpu_lanes || null,
        offer.pci_gen || null,
        offer.pcie_bw || null,
        
        // CPU specs
        offer.cpu_name || null,
        offer.cpu_cores || null,
        offer.cpu_cores_effective || null,
        offer.cpu_ghz || null,
        offer.cpu_ram || null,
        offer.cpu_arch || null,
        offer.has_avx || null,
        
        // Storage
        offer.disk_name || null,
        offer.disk_space || null,
        offer.disk_bw || null,
        
        // Pricing
        offer.dph_base || offer.min_bid || 0,
        offer.dph_total_adj || null,
        offer.discounted_dph_total || null,
        offer.min_bid || null,
        offer.storage_cost || null,
        offer.vram_costperhour || null,
        
        // Internet
        offer.inet_down || null,
        offer.inet_up || null,
        offer.inet_down_cost || null,
        offer.inet_up_cost || null,
        offer.internet_down_cost_per_tb || null,
        offer.internet_up_cost_per_tb || null,
        
        // Performance
        offer.dlperf || null,
        offer.dlperf_per_dphtotal || null,
        offer.flops_per_dphtotal || null,
        offer.total_flops || null,
        offer.score || null,
        
        // Reliability
        offer.reliability || null,
        offer.reliability2 || null,
        offer.reliability_mult || null,
        offer.verification || 'unverified',
        offer.verified || false,
        offer.expected_reliability || null,
        
        // Location
        offer.geolocation || null,
        offer.geolocode || null,
        offer.public_ipaddr || null,
        offer.static_ip || false,
        offer.direct_port_count || null,
        
        // System
        offer.os_version || null,
        offer.driver_version || null,
        offer.driver_vers || null,
        offer.cuda_max_good || null,
        offer.mobo_name || null,
        
        // Availability
        offer.rentable !== false,
        offer.start_date || null,
        offer.end_date || null,
        offer.duration || null,
        offer.time_remaining || null,
        
        // VM
        offer.vms_enabled || false,
        offer.is_vm_deverified || false,
        
        // Business
        offer.hosting_type || null,
        offer.resource_type || 'gpu',
        offer.discount_rate || null,
        offer.credit_discount_max || null,
        
        // Metadata
        timestamp,
        timestamp,
        expiresAt
      ).run();
    } catch (error) {
      console.error('Error storing offer:', error);
      throw error;
    }
  }

  /**
   * Store GPU machine in database
   */
  private async storeMachine(machine: any): Promise<void> {
    const id = machine.id || crypto.randomUUID();
    
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO gpu_machines 
      (id, host_id, model, memory_gb, cuda_version, driver_version, 
       availability_status, location, external_machine_id, specifications, updated_at, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      machine.host_id || null,
      machine.model || 'unknown',
      machine.memory_gb || null,
      machine.cuda_version || null,
      machine.driver_version || null,
      machine.availability_status || 'unknown',
      machine.location || null,
      machine.id || null,
      JSON.stringify(machine),
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
  }

  /**
   * Store GPU host in database
   */
  private async storeHost(host: any): Promise<void> {
    const id = host.id || crypto.randomUUID();
    
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO gpu_hosts 
      (id, name, location, country_code, total_machines, available_machines,
       reliability_score, external_host_id, contact_info, updated_at, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      host.name || null,
      host.location || null,
      host.country_code || null,
      host.total_machines || 0,
      host.available_machines || 0,
      host.reliability_score || null,
      host.id || null,
      JSON.stringify(host),
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
  }

  /**
   * Update sync job status in database
   */
  private async updateSyncJob(syncJobId: string, status: string, recordsProcessed: number, errorMessage?: string): Promise<void> {
    const updateData = {
      status,
      records_processed: recordsProcessed,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      error_message: errorMessage || null
    };

    await this.env.DB.prepare(`
      UPDATE market_sync_jobs 
      SET status = ?, records_processed = ?, completed_at = ?, error_message = ?
      WHERE id = ?
    `).bind(
      updateData.status,
      updateData.records_processed,
      updateData.completed_at,
      updateData.error_message,
      syncJobId
    ).run();
  }

  /**
   * Utility: Add delay between requests
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}