export const name = 'dsh-sandbox-manager'
export const inject = ['tools']

const STATUS = Object.freeze({
  ok: true,
  tool: 'sandbox_manager_status',
  version: '0.2.1',
  mode: 'READ_ONLY_STATUS',
  nativeEnforcement: 'NOT_CONNECTED',
  productionNodeIsolated: 'NOT_VERIFIED',
  androidVirtualMachine: 'NO',
  snapshots: 'METADATA_ONLY',
  actualGrantsIssued: 0,
})

function safeJson(value) {
  return JSON.stringify(value)
}

export function apply(ctx) {
  if (!ctx || typeof ctx.tools?.register !== 'function') {
    throw new Error('DSH_TOOL_REGISTRATION_UNAVAILABLE')
  }
  ctx.tools.register({
    name: 'sandbox_manager_status',
    description: 'Read-only Tra sandbox status. It does not grant permissions, run shell commands, access files, launch VMs, or claim native isolation.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['status', 'help'],
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render(_args, value) {
        return [{ type: 'text', text: String(value) }]
      },
    },
    async execute(args) {
      if (args?.action === 'status') return safeJson(STATUS)
      if (args?.action === 'help') {
        return 'Tra v0.2.1 is currently a read-only DSH status plugin. The separate management UI only stores local configuration metadata. Android native enforcement is not connected.'
      }
      return safeJson({ ok: false, error: 'DENIED_UNSUPPORTED_ACTION' })
    },
  })
}
