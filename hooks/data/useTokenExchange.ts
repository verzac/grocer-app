import useSWRMutation from 'swr/mutation';

import { exchangeAuthCode } from '@/lib/api/client';

type ExchangeArgs = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

export function useTokenExchange() {
  return useSWRMutation(
    'auth/token',
    async (_, { arg }: { arg: ExchangeArgs }) =>
      exchangeAuthCode({
        code: arg.code,
        code_verifier: arg.codeVerifier,
        redirect_uri: arg.redirectUri,
      }),
  );
}
