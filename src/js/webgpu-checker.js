/**
 * WebGPU Capability Checker
 * Provides comprehensive checking of WebGPU availability and capabilities
 */

class WebGPUCapabilityChecker {
    constructor() {
        this.capabilities = {
            available: false,
            supported: false,
            adapter: null,
            device: null,
            reasons: [],
            features: [],
            limits: {},
            performanceInfo: {},
            errors: [],
        };
    }

    /**
     * Check if WebGPU is available in the current browser/context
     */
    async checkAvailability() {
        this.capabilities.reasons = [];
        this.capabilities.errors = [];

        // Check if navigator.gpu exists
        if (!navigator.gpu) {
            this.capabilities.reasons.push('WebGPU API not available - navigator.gpu is undefined');
            this.capabilities.errors.push('BROWSER_NOT_SUPPORTED');
            return this.capabilities;
        }

        this.capabilities.available = true;
        return this.capabilities;
    }

    /**
     * Check if we can get a GPU adapter
     */
    async checkAdapter() {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                this.capabilities.reasons.push('No GPU adapter found - GPU may be disabled or unsupported');
                this.capabilities.errors.push('NO_ADAPTER');
                return this.capabilities;
            }

            this.capabilities.adapter = adapter;
            this.capabilities.supported = true;

            // Get adapter info
            const adapterInfo = adapter.info || {};
            this.capabilities.performanceInfo = {
                vendor: adapterInfo.vendor || 'Unknown',
                architecture: adapterInfo.architecture || 'Unknown',
                device: adapterInfo.device || 'Unknown',
                description: adapterInfo.description || 'Unknown',
            };

            return this.capabilities;
        } catch (error) {
            this.capabilities.reasons.push(`Failed to get GPU adapter: ${error.message}`);
            this.capabilities.errors.push('ADAPTER_ERROR');
            return this.capabilities;
        }
    }

    /**
     * Check if we can request a device and get its capabilities
     */
    async checkDevice() {
        if (!this.capabilities.adapter) {
            return this.capabilities;
        }

        try {
            const device = await this.capabilities.adapter.requestDevice();
            if (!device) {
                this.capabilities.reasons.push('Failed to create GPU device');
                this.capabilities.errors.push('DEVICE_CREATION_FAILED');
                return this.capabilities;
            }

            this.capabilities.device = device;

            // Get available features
            this.capabilities.features = Array.from(device.features);

            // Get limits
            this.capabilities.limits = {
                maxComputeWorkgroupStorageSize: device.limits.maxComputeWorkgroupStorageSize,
                maxComputeInvocationsPerWorkgroup: device.limits.maxComputeInvocationsPerWorkgroup,
                maxComputeWorkgroupSizeX: device.limits.maxComputeWorkgroupSizeX,
                maxComputeWorkgroupSizeY: device.limits.maxComputeWorkgroupSizeY,
                maxComputeWorkgroupSizeZ: device.limits.maxComputeWorkgroupSizeZ,
                maxComputeWorkgroupsPerDimension: device.limits.maxComputeWorkgroupsPerDimension,
                maxStorageBufferBindingSize: device.limits.maxStorageBufferBindingSize,
                maxBufferSize: device.limits.maxBufferSize,
                maxUniformBufferBindingSize: device.limits.maxUniformBufferBindingSize,
            };

            return this.capabilities;
        } catch (error) {
            this.capabilities.reasons.push(`Failed to create GPU device: ${error.message}`);
            this.capabilities.errors.push('DEVICE_ERROR');
            return this.capabilities;
        }
    }

    /**
     * Test basic compute shader compilation
     */
    async testComputeShader() {
        if (!this.capabilities.device) {
            return this.capabilities;
        }

        try {
            const testShaderCode = `
                @compute @workgroup_size(1)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    // Basic compute shader test
                }
            `;

            const shaderModule = this.capabilities.device.createShaderModule({
                code: testShaderCode,
            });

            // Test pipeline creation
            this.capabilities.device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint: 'main',
                },
            });

            this.capabilities.reasons.push('Basic compute shader compilation successful');
            return this.capabilities;
        } catch (error) {
            this.capabilities.reasons.push(`Compute shader test failed: ${error.message}`);
            this.capabilities.errors.push('SHADER_COMPILATION_FAILED');
            return this.capabilities;
        }
    }

    /**
     * Check HTTPS requirement
     */
    checkSecureContext() {
        if (!window.isSecureContext) {
            this.capabilities.reasons.push('WebGPU requires a secure context (HTTPS, localhost, or file://)');
            this.capabilities.errors.push('INSECURE_CONTEXT');
            return false;
        }
        return true;
    }

    /**
     * Check browser compatibility
     */
    checkBrowserCompatibility() {
        const userAgent = navigator.userAgent;
        let browserInfo = 'Unknown browser';

        if (userAgent.includes('Chrome')) {
            const match = userAgent.match(/Chrome\/(\d+)/);
            const version = match ? parseInt(match[1]) : 0;
            browserInfo = `Chrome ${version}`;
            if (version < 113) {
                // WebGPU was enabled by default in Chrome 113
                this.capabilities.reasons.push(`Chrome version ${version} is too old. WebGPU requires Chrome 113+`);
                this.capabilities.errors.push('BROWSER_VERSION_TOO_OLD');
            }
        } else if (userAgent.includes('Firefox')) {
            const match = userAgent.match(/Firefox\/(\d+)/);
            const version = match ? parseInt(match[1]) : 0;
            browserInfo = `Firefox ${version}`;
            if (version < 113) {
                // WebGPU support started in Firefox 113
                this.capabilities.reasons.push(`Firefox version ${version} is too old. WebGPU requires Firefox 113+`);
                this.capabilities.errors.push('BROWSER_VERSION_TOO_OLD');
            }
        } else if (userAgent.includes('Safari')) {
            const match = userAgent.match(/Version\/(\d+)/);
            const version = match ? parseInt(match[1]) : 0;
            browserInfo = `Safari ${version}`;
            if (version < 16.4) {
                // WebGPU support started in Safari 16.4
                this.capabilities.reasons.push(`Safari version ${version} is too old. WebGPU requires Safari 16.4+`);
                this.capabilities.errors.push('BROWSER_VERSION_TOO_OLD');
            }
        } else if (userAgent.includes('Edge')) {
            const match = userAgent.match(/Edg\/(\d+)/);
            const version = match ? parseInt(match[1]) : 0;
            browserInfo = `Edge ${version}`;
            if (version < 113) {
                this.capabilities.reasons.push(`Edge version ${version} is too old. WebGPU requires Edge 113+`);
                this.capabilities.errors.push('BROWSER_VERSION_TOO_OLD');
            }
        } else {
            this.capabilities.reasons.push('Unsupported browser for WebGPU');
            this.capabilities.errors.push('UNSUPPORTED_BROWSER');
        }

        this.capabilities.performanceInfo.browser = browserInfo;
        return this.capabilities;
    }

    /**
     * Run comprehensive WebGPU capability check
     */
    async runFullCheck() {
        // Reset capabilities
        this.capabilities = {
            available: false,
            supported: false,
            adapter: null,
            device: null,
            reasons: [],
            features: [],
            limits: {},
            performanceInfo: {},
            errors: [],
        };

        // Check secure context first
        if (!this.checkSecureContext()) {
            return this.capabilities;
        }

        // Check browser compatibility
        this.checkBrowserCompatibility();

        // Check basic availability
        await this.checkAvailability();
        if (!this.capabilities.available) {
            return this.capabilities;
        }

        // Check adapter
        await this.checkAdapter();
        if (!this.capabilities.supported) {
            return this.capabilities;
        }

        // Check device
        await this.checkDevice();
        if (!this.capabilities.device) {
            return this.capabilities;
        }

        // Test compute shader
        await this.testComputeShader();

        return this.capabilities;
    }

    /**
     * Get a human-readable status message
     */
    getStatusMessage() {
        if (this.capabilities.supported && this.capabilities.device) {
            return 'WebGPU is fully supported and available for GPU acceleration';
        } else if (this.capabilities.available) {
            return 'WebGPU is available but has limitations';
        } else {
            return 'WebGPU is not supported in this browser or environment';
        }
    }

    /**
     * Get performance tier based on capabilities
     */
    getPerformanceTier() {
        if (!this.capabilities.supported) {
            return 'unavailable';
        }

        const limits = this.capabilities.limits;
        if (!limits.maxComputeInvocationsPerWorkgroup) {
            return 'unknown';
        }

        // High-end GPU
        if (
            limits.maxComputeInvocationsPerWorkgroup >= 1024 &&
            limits.maxComputeWorkgroupSizeX >= 1024 &&
            limits.maxStorageBufferBindingSize >= 134217728
        ) {
            // 128MB
            return 'high';
        }

        // Mid-range GPU
        if (
            limits.maxComputeInvocationsPerWorkgroup >= 512 &&
            limits.maxComputeWorkgroupSizeX >= 512 &&
            limits.maxStorageBufferBindingSize >= 67108864
        ) {
            // 64MB
            return 'medium';
        }

        // Low-end GPU
        return 'low';
    }
}

// Export singleton instance
export const webgpuChecker = new WebGPUCapabilityChecker();

// Export class for custom instances
export default WebGPUCapabilityChecker;
