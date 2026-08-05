import { useState } from 'react'
import {
  Button, Input, Field,
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent, DialogTrigger,
} from '@fluentui/react-components'
import { LockOpenRegular } from '@fluentui/react-icons'
import { getAccess, savePublishSettings } from '../publish.js'
import { decryptToken } from '../pinCrypto.js'

// Participant unlock: the correct PIN decrypts the published token into
// publish settings, enabling result entry + auto-sync like the host.
export default function UnlockDialog({ open, onClose, onUnlocked }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  async function unlock() {
    try {
      const token = await decryptToken(getAccess(), pin.trim())
      savePublishSettings({ token, pin: '' })
      onUnlocked?.()
      onClose()
    } catch {
      setError('Wrong PIN.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, { open }) => !open && onClose()}>
      <DialogSurface style={{ maxWidth: '380px' }}>
        <DialogBody>
          <DialogTitle>Report results</DialogTitle>
          <DialogContent>
            <Field label="PIN" hint="Ask the tournament host for the PIN." validationMessage={error || undefined}>
              <Input
                value={pin}
                onChange={(_, { value }) => { setPin(value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && pin.trim() && unlock()}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" disabled={!pin.trim()} icon={<LockOpenRegular />} onClick={unlock}>
              Unlock
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
