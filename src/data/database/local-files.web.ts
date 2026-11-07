/** Browser picker URIs are retained as-is; durable media queuing is a native mobile feature. */
export async function keepLocalAsset(uri: string, _filename: string): Promise<string> { return uri; }
export async function removeLocalAssetFile(_uri: string): Promise<void> {}
