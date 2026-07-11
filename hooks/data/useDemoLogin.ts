import useSWRMutation from 'swr/mutation'

import { demoLogin } from '@/lib/api/client'

export function useDemoLogin() {
  return useSWRMutation(
    'auth/demo-login',
    async (_, { arg }: { arg: string }) => demoLogin(arg),
  )
}
