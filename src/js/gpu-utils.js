/**
 * GPU Utilities for Vanity ETH
 * Provides utility functions for GPU detection and optimization
 */

import { webgpuChecker } from './webgpu-checker.js';

/**
 * Check if WebGPU is available and supported
 */
export async function checkWebGPUAvailability() {
    try {
        const capabilities = await webgpuChecker.runFullCheck();
        return {
            available: capabilities.available,
            supported: capabilities.supported,
            performanceTier: webgpuChecker.getPerformanceTier(),
            reasons: capabilities.reasons,
            errors: capabilities.errors,
        };
    } catch (error) {
        return {
            available: false,
            supported: false,
            performanceTier: 'unavailable',
            reasons: [`Error checking WebGPU: ${error.message}`],
            errors: ['CHECK_ERROR'],
        };
    }
}

/**
 * Get optimized GPU parameters based on device capabilities
 */
export async function getOptimizedGPUParameters() {
    try {
        const capabilities = await webgpuChecker.runFullCheck();

        if (!capabilities.supported) {
            return {
                useGPU: false,
                reason: 'WebGPU not supported',
                optimizedNB_ITER: 256,
                optimizedNB_THREAD: 64,
            };
        }

        const limits = capabilities.limits || {};
        const performanceTier = webgpuChecker.getPerformanceTier();

        // Optimize parameters based on GPU capabilities
        let optimizedNB_ITER = 256; // default
        let optimizedNB_THREAD = 64; // default

        // High-end GPU
        if (performanceTier === 'high') {
            optimizedNB_ITER = Math.min(512, Math.floor(limits.maxComputeWorkgroupsPerDimension / 2) || 512);
            optimizedNB_THREAD = Math.min(256, limits.maxComputeWorkgroupSizeX || 256);
        }
        // Mid-range GPU
        else if (performanceTier === 'medium') {
            optimizedNB_ITER = Math.min(384, Math.floor(limits.maxComputeWorkgroupsPerDimension / 3) || 384);
            optimizedNB_THREAD = Math.min(128, limits.maxComputeWorkgroupSizeX || 128);
        }
        // Low-end GPU
        else if (performanceTier === 'low') {
            optimizedNB_ITER = Math.min(256, Math.floor(limits.maxComputeWorkgroupsPerDimension / 4) || 256);
            optimizedNB_THREAD = Math.min(64, limits.maxComputeWorkgroupSizeX || 64);
        }

        return {
            useGPU: true,
            performanceTier,
            optimizedNB_ITER,
            optimizedNB_THREAD,
            gpuInfo: capabilities.performanceInfo,
            limits,
        };
    } catch (error) {
        return {
            useGPU: false,
            reason: `Error getting GPU parameters: ${error.message}`,
            optimizedNB_ITER: 256,
            optimizedNB_THREAD: 64,
        };
    }
}

/**
 * Estimate performance improvement over CPU
 */
export function estimatePerformanceGain(performanceTier, threadCount = 4) {
    const gains = {
        high: 20 + threadCount * 2, // 20-28x faster
        medium: 10 + threadCount, // 10-14x faster
        low: 4 + threadCount * 0.5, // 4-6x faster
        unavailable: 0,
    };

    return Math.max(1, gains[performanceTier] || 0);
}

/**
 * Get human-readable performance description
 */
export function getPerformanceDescription(performanceTier, estimatedGain) {
    const descriptions = {
        high: `High-performance GPU detected. Estimated ${estimatedGain}x speedup over CPU.`,
        medium: `Mid-range GPU detected. Estimated ${estimatedGain}x speedup over CPU.`,
        low: `Low-end GPU detected. Estimated ${estimatedGain}x speedup over CPU.`,
        unavailable: 'GPU acceleration not available. Using CPU-only mode.',
    };

    return descriptions[performanceTier] || descriptions.unavailable;
}

/**
 * Determine if GPU should be used based on user preference and capabilities
 */
export async function shouldUseGPU(preferGPU = true) {
    if (!preferGPU) {
        return { useGPU: false, reason: 'User prefers CPU' };
    }

    const availability = await checkWebGPUAvailability();

    if (!availability.supported) {
        return {
            useGPU: false,
            reason: availability.reasons.join('; ') || 'WebGPU not supported',
        };
    }

    const params = await getOptimizedGPUParameters();
    return {
        useGPU: params.useGPU,
        reason: params.reason || 'GPU acceleration available',
        performanceTier: params.performanceTier,
        parameters: params,
    };
}

export default {
    checkWebGPUAvailability,
    getOptimizedGPUParameters,
    estimatePerformanceGain,
    getPerformanceDescription,
    shouldUseGPU,
    webgpuChecker,
};
