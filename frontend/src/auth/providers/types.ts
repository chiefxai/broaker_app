export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

/** Platform independent auth contract. Providers own credential exchange; UI owns flows. */
export interface AuthProviderAdapter {
  signIn(email: string, password: string): Promise<AuthTokens>;
  signUp(input: SignUpInput): Promise<AuthTokens>;
}
