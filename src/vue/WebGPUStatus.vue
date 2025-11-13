<template>
    <div class="panel" id="webgpu-status-panel">
        <h3>GPU Acceleration Status</h3>

        <!-- Status Overview -->
        <div class="status-overview">
            <div class="status-indicator" :class="statusClass">
                <div class="icon">
                    <i v-if="capabilities.supported" class="fas fa-check-circle"></i>
                    <i v-else-if="capabilities.available" class="fas fa-exclamation-triangle"></i>
                    <i v-else class="fas fa-times-circle"></i>
                </div>
                <div class="status-text">
                    <h4>{{ statusTitle }}</h4>
                    <p>{{ statusMessage }}</p>
                </div>
            </div>
        </div>

        <!-- Performance Tier -->
        <div v-if="capabilities.supported" class="performance-tier">
            <h5>
                Performance Tier: <span :class="tierClass">{{ performanceTier.toUpperCase() }}</span>
            </h5>
            <div class="tier-bar">
                <div class="tier-fill" :class="tierClass" :style="{ width: tierWidth }"></div>
            </div>
            <p class="performance-estimate">
                <i class="fas fa-tachometer-alt"></i>
                Estimated {{ estimatedGain }}x faster than CPU
            </p>
        </div>

        <!-- Detailed Information -->
        <div v-if="showDetails" class="detailed-info">
            <h5>Technical Details</h5>

            <!-- GPU Info -->
            <div v-if="capabilities.performanceInfo" class="info-section">
                <h6>GPU Information</h6>
                <div class="info-grid">
                    <div class="info-item" v-if="capabilities.performanceInfo.vendor">
                        <span class="label">Vendor:</span>
                        <span class="value">{{ capabilities.performanceInfo.vendor }}</span>
                    </div>
                    <div class="info-item" v-if="capabilities.performanceInfo.device">
                        <span class="label">Device:</span>
                        <span class="value">{{ capabilities.performanceInfo.device }}</span>
                    </div>
                    <div class="info-item" v-if="capabilities.performanceInfo.architecture">
                        <span class="label">Architecture:</span>
                        <span class="value">{{ capabilities.performanceInfo.architecture }}</span>
                    </div>
                    <div class="info-item" v-if="capabilities.performanceInfo.browser">
                        <span class="label">Browser:</span>
                        <span class="value">{{ capabilities.performanceInfo.browser }}</span>
                    </div>
                </div>
            </div>

            <!-- Limits -->
            <div v-if="capabilities.limits && Object.keys(capabilities.limits).length > 0" class="info-section">
                <h6>GPU Limits</h6>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="label">Max Compute Invocations:</span>
                        <span class="value">{{
                            formatNumber(capabilities.limits.maxComputeInvocationsPerWorkgroup)
                        }}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Max Workgroup Size X:</span>
                        <span class="value">{{ formatNumber(capabilities.limits.maxComputeWorkgroupSizeX) }}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Max Storage Buffer:</span>
                        <span class="value">{{ formatBytes(capabilities.limits.maxStorageBufferBindingSize) }}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Max Buffer Size:</span>
                        <span class="value">{{ formatBytes(capabilities.limits.maxBufferSize) }}</span>
                    </div>
                </div>
            </div>

            <!-- Features -->
            <div v-if="capabilities.features && capabilities.features.length > 0" class="info-section">
                <h6>Supported Features</h6>
                <div class="features-list">
                    <span v-for="feature in displayedFeatures" :key="feature" class="feature-tag">
                        {{ feature }}
                    </span>
                    <button
                        v-if="capabilities.features.length > 10"
                        @click="showAllFeatures = !showAllFeatures"
                        class="show-more-btn"
                    >
                        {{ showAllFeatures ? 'Show Less' : `Show ${capabilities.features.length - 10} More` }}
                    </button>
                </div>
            </div>

            <!-- Issues/Reasons -->
            <div v-if="capabilities.reasons && capabilities.reasons.length > 0" class="info-section">
                <h6 v-if="!capabilities.supported">Issues Detected</h6>
                <h6 v-else>Notes</h6>
                <ul class="reasons-list">
                    <li v-for="reason in capabilities.reasons" :key="reason">{{ reason }}</li>
                </ul>
            </div>
        </div>

        <!-- Actions -->
        <div class="actions">
            <button @click="toggleDetails" class="details-btn">
                <i :class="showDetails ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                {{ showDetails ? 'Hide Details' : 'Show Details' }}
            </button>
            <button @click="recheckWebGPU" class="recheck-btn" :disabled="checking">
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': checking }"></i>
                {{ checking ? 'Checking...' : 'Recheck' }}
            </button>
        </div>
    </div>
</template>

<script>
    import { webgpuChecker } from '../js/webgpu-checker.js';

    export default {
        name: 'WebGPUStatus',
        data() {
            return {
                capabilities: {
                    available: false,
                    supported: false,
                    adapter: null,
                    device: null,
                    reasons: [],
                    features: [],
                    limits: {},
                    performanceInfo: {},
                    errors: [],
                },
                checking: false,
                showDetails: false,
                showAllFeatures: false,
            };
        },
        computed: {
            statusClass() {
                if (this.capabilities.supported) return 'status-success';
                if (this.capabilities.available) return 'status-warning';
                return 'status-error';
            },
            statusTitle() {
                if (this.capabilities.supported) return 'WebGPU Available';
                if (this.capabilities.available) return 'WebGPU Limited';
                return 'WebGPU Unavailable';
            },
            statusMessage() {
                return webgpuChecker.getStatusMessage();
            },
            performanceTier() {
                return webgpuChecker.getPerformanceTier();
            },
            tierClass() {
                const tier = this.performanceTier;
                if (tier === 'high') return 'tier-high';
                if (tier === 'medium') return 'tier-medium';
                if (tier === 'low') return 'tier-low';
                return 'tier-unknown';
            },
            tierWidth() {
                const tier = this.performanceTier;
                if (tier === 'high') return '100%';
                if (tier === 'medium') return '66%';
                if (tier === 'low') return '33%';
                return '0%';
            },
            estimatedGain() {
                const gains = {
                    high: 24,
                    medium: 12,
                    low: 5,
                    unknown: 0,
                };
                return gains[this.performanceTier] || 0;
            },
            displayedFeatures() {
                if (this.showAllFeatures || this.capabilities.features.length <= 10) {
                    return this.capabilities.features;
                }
                return this.capabilities.features.slice(0, 10);
            },
        },
        methods: {
            async checkWebGPUStatus() {
                this.checking = true;
                try {
                    this.capabilities = await webgpuChecker.runFullCheck();
                } catch (error) {
                    console.error('Error checking WebGPU status:', error);
                    this.capabilities.reasons.push(`Error during check: ${error.message}`);
                } finally {
                    this.checking = false;
                }
            },
            toggleDetails() {
                this.showDetails = !this.showDetails;
            },
            async recheckWebGPU() {
                await this.checkWebGPUStatus();
            },
            formatNumber(num) {
                if (num === undefined || num === null) return 'N/A';
                return num.toLocaleString();
            },
            formatBytes(bytes) {
                if (bytes === undefined || bytes === null) return 'N/A';
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                if (bytes === 0) return '0 Bytes';
                const i = Math.floor(Math.log(bytes) / Math.log(1024));
                return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
            },
        },
        async mounted() {
            await this.checkWebGPUStatus();
        },
    };
</script>

<style lang="sass" scoped>
    @import "../css/variables"

    .panel
        min-height: 200px

    h3
        margin-bottom: 1em
        color: $text

    h4, h5, h6
        color: $text
        margin-bottom: 0.5em

    .status-overview
        margin-bottom: 1.5em

    .status-indicator
        display: flex
        align-items: center
        padding: 1em
        border-radius: 8px
        border-left: 4px solid

        &.status-success
            background-color: rgba(40, 167, 69, 0.1)
            border-left-color: #28a745

        &.status-warning
            background-color: rgba(255, 193, 7, 0.1)
            border-left-color: #ffc107

        &.status-error
            background-color: rgba(220, 53, 69, 0.1)
            border-left-color: #dc3545

    .icon
        font-size: 2em
        margin-right: 1em

        .fa-check-circle
            color: #28a745

        .fa-exclamation-triangle
            color: #ffc107

        .fa-times-circle
            color: #dc3545

    .status-text h4
        margin: 0 0 0.25em 0
        font-size: 1.2em

    .status-text p
        margin: 0
        color: $text-alt
        font-size: 0.9em

    .performance-tier
        margin-bottom: 1.5em

    .performance-estimate
        margin: 0.5em 0 0 0
        color: $text-alt
        font-size: 0.9em
        font-style: italic

        i
            margin-right: 0.5em
            color: $primary

    .tier-high
        color: #28a745

    .tier-medium
        color: #ffc107

    .tier-low
        color: #fd7e14

    .tier-unknown
        color: $text-alt

    .tier-bar
        height: 8px
        background-color: $panel-background-alt
        border-radius: 4px
        overflow: hidden
        margin-top: 0.5em

    .tier-fill
        height: 100%
        transition: width 0.3s ease
        border-radius: 4px

        &.tier-high
            background-color: #28a745

        &.tier-medium
            background-color: #ffc107

        &.tier-low
            background-color: #fd7e14

    .detailed-info
        border-top: 1px solid $panel-background-alt
        padding-top: 1.5em
        margin-bottom: 1.5em

    .info-section
        margin-bottom: 1.5em

        h6
            font-weight: 600
            margin-bottom: 0.75em
            color: $text

    .info-grid
        display: grid
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))
        gap: 0.75em

    .info-item
        display: flex
        justify-content: space-between
        align-items: center
        padding: 0.5em
        background-color: $panel-background-alt
        border-radius: 4px

    .label
        font-weight: 500
        color: $text-alt

    .value
        font-weight: 600
        color: $text
        font-family: $monospace-font

    .features-list
        display: flex
        flex-wrap: wrap
        gap: 0.5em

    .feature-tag
        background-color: $panel-background-alt
        color: $text
        padding: 0.25em 0.5em
        border-radius: 12px
        font-size: 0.8em
        font-family: $monospace-font

    .show-more-btn
        background: none
        border: none
        color: $primary
        cursor: pointer
        font-size: 0.8em
        padding: 0.25em 0.5em
        border-radius: 4px

        &:hover
            background-color: $panel-background-alt

    .reasons-list
        margin: 0
        padding-left: 1.5em

        li
            margin-bottom: 0.5em
            color: $text-alt

    .actions
        display: flex
        gap: 1em
        justify-content: flex-end

    .details-btn, .recheck-btn
        background: $panel-background-alt
        border: 1px solid $panel-background
        color: $text
        padding: 0.5em 1em
        border-radius: 4px
        cursor: pointer
        display: flex
        align-items: center
        gap: 0.5em
        font-size: 0.9em

        &:hover:not(:disabled)
            background-color: $panel-background

        &:disabled
            opacity: 0.6
            cursor: not-allowed

    .fa-spin
        animation: spin 1s linear infinite

    @keyframes spin
        from
            transform: rotate(0deg)
        to
            transform: rotate(360deg)

    @media (max-width: 768px)
        .info-grid
            grid-template-columns: 1fr

        .actions
            flex-direction: column

        .details-btn, .recheck-btn
            justify-content: center
</style>
