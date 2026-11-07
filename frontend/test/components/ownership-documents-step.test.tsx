import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';

import { OwnershipDocumentsStep, type OwnershipDocumentsStepProps } from '@/components/core/wizard/OwnershipDocumentsStep';
import { ownershipDocumentsReferenceFixture } from '../fixtures/ownership-documents';
import { renderWithProviders } from '../utils/render';
jest.mock('@expo/ui/community/bottom-sheet', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ index, children, testID }: { index: number; children: React.ReactNode; testID?: string }) => index >= 0 ? <View testID={testID}>{children}</View> : null };
});

function makeProps(overrides: Partial<OwnershipDocumentsStepProps> = {}): OwnershipDocumentsStepProps {
  return {
    ...ownershipDocumentsReferenceFixture,
    onAuthoritySave: jest.fn() as OwnershipDocumentsStepProps['onAuthoritySave'],
    onAuthorityRemove: jest.fn() as OwnershipDocumentsStepProps['onAuthorityRemove'],
    onChooseFieldAssociate: jest.fn(),
    onPrivateNotesChange: jest.fn(),
    onChooseDocument: jest.fn(),
    onScanDocument: jest.fn(),
    onOpenDocument: jest.fn(),
    onDocumentActions: jest.fn(),
    onAddReferenceLink: jest.fn(),
    onOpenReferenceLink: jest.fn(),
    ...overrides,
  };
}

describe('OwnershipDocumentsStep', () => {
  it('renders progress, private workspace, authorities, legal files, and reference links', async () => {
    const { getByTestId, getByText, getByRole } = await renderWithProviders(<OwnershipDocumentsStep {...makeProps()} />);

    expect(getByTestId('ownership-documents-progress')).toBeTruthy();
    expect(getByText('Broker Vault')).toBeTruthy();
    expect(getByText('Signing Authorities')).toBeTruthy();
    expect(getByText('K. Muthusamy')).toBeTruthy();
    expect(getByText('Private Workspace & Internal Notes')).toBeTruthy();
    expect(getByText('Legal documents')).toBeTruthy();
    expect(getByText('Upload checks confirm the file is stored and matches its type. Legal ownership and validity still need review.')).toBeTruthy();
    expect(getByText('3 files')).toBeTruthy();
    expect(getByText('Clear')).toBeTruthy();
    expect(getByRole('button', { name: 'Open Survey Cadastral Map (TN e-Services) in external browser' })).toBeTruthy();
  });

  it('forwards authority, document, note, and link actions to the caller', async () => {
    const props = makeProps();
    const { getByRole, getByTestId } = await renderWithProviders(<OwnershipDocumentsStep {...props} />);

    await fireEvent.press(getByRole('button', { name: 'Edit K. Muthusamy' }));
    await fireEvent.changeText(getByTestId('signing-authority-name'), 'K. Muthusamy Updated');
    await fireEvent.press(getByRole('button', { name: 'Save changes' }));
    await fireEvent.press(getByRole('button', { name: 'Choose file' }));
    await fireEvent.press(getByRole('button', { name: 'Scan document' }));
    await fireEvent.press(getByRole('button', { name: 'More actions for Mother Deed (1984 Registration).pdf' }));
    await fireEvent.press(getByRole('button', { name: 'Add another property reference link' }));
    await fireEvent.press(getByRole('button', { name: 'Open Survey Cadastral Map (TN e-Services) in external browser' }));
    await fireEvent.changeText(getByTestId('private-broker-notes'), 'Reviewed deed.');

    expect(props.onAuthoritySave).toHaveBeenCalledWith(expect.objectContaining({ name: 'K. Muthusamy Updated' }), 'owner-primary');
    expect(props.onChooseDocument).toHaveBeenCalledTimes(1);
    expect(props.onScanDocument).toHaveBeenCalledTimes(1);
    expect(props.onDocumentActions).toHaveBeenCalledWith(props.documents[0]);
    expect(props.onPrivateNotesChange).toHaveBeenCalledWith('Reviewed deed.');
    expect(props.onAddReferenceLink).toHaveBeenCalledTimes(1);
    expect(props.onOpenReferenceLink).toHaveBeenCalledWith(props.referenceLinks[0]);
  });

  it('adds an authority only after required identity and contact fields validate', async () => {
    const props = makeProps();
    const { getByRole, getByTestId, getAllByRole } = await renderWithProviders(<OwnershipDocumentsStep {...props} />);
    await fireEvent.press(getByRole('button', { name: 'Add signing authority' }));
    await fireEvent.press(getByRole('button', { name: 'Add signer' }));
    expect(getAllByRole('alert').map((item) => item.props.children)).toEqual(expect.arrayContaining([
      'Enter the signer’s full legal name.', 'Enter a valid phone number.', 'Enter the signer’s relationship to the owner.',
    ]));
    expect(getByTestId('toast')).toBeTruthy();
    expect(props.onAuthoritySave).not.toHaveBeenCalled();
    await fireEvent.changeText(getByTestId('signing-authority-name'), 'Ravi Kumar');
    await fireEvent.changeText(getByTestId('signing-authority-phone'), 'invalid');
    await fireEvent.changeText(getByTestId('signing-authority-relationship'), 'Co-owner');
    await fireEvent.press(getByRole('button', { name: 'Add signer' }));
    expect(getByRole('alert').props.children).toBe('Enter a valid phone number.');
    expect(getByTestId('toast')).toBeTruthy();
    await fireEvent.changeText(getByTestId('signing-authority-phone'), '+91 98765 43210');
    await fireEvent.changeText(getByTestId('signing-authority-record-reference'), 'Patta 219');
    await fireEvent.press(getByRole('button', { name: 'Add signer' }));
    expect(props.onAuthoritySave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ravi Kumar', phone: '+91 98765 43210', relationship: 'Co-owner', recordValue: 'Patta 219' }), undefined);
  });

  it('keeps the editor open and reports backend save failures for retry', async () => {
    const props = makeProps({ authorities: [], onAuthoritySave: (() => Promise.reject(new Error('Could not save signing authority.'))) as OwnershipDocumentsStepProps['onAuthoritySave'] });
    const { getByRole, getByTestId, findByText } = await renderWithProviders(<OwnershipDocumentsStep {...props} />);
    await fireEvent.press(getByRole('button', { name: 'Add signing authority' }));
    await fireEvent.changeText(getByTestId('signing-authority-name'), 'Ravi Kumar');
    await fireEvent.changeText(getByTestId('signing-authority-phone'), '+91 98765 43210');
    await fireEvent.changeText(getByTestId('signing-authority-relationship'), 'Co-owner');
    await fireEvent.press(getByRole('button', { name: 'Add signer' }));
    expect(await findByText('Could not save signing authority.')).toBeTruthy();
    expect(getByRole('button', { name: 'Add signer' })).toBeTruthy();
  });

  it('removes signers while keeping the last remaining signer protected', async () => {
    const props = makeProps();
    const { getByRole, unmount } = await renderWithProviders(<OwnershipDocumentsStep {...props} />);
    await fireEvent.press(getByRole('button', { name: 'Remove K. Muthusamy' }));
    expect(props.onAuthorityRemove).toHaveBeenCalledWith('owner-primary');
    await unmount();

    const single = makeProps({ authorities: ownershipDocumentsReferenceFixture.authorities.slice(0, 1) });
    const oneSigner = await renderWithProviders(<OwnershipDocumentsStep {...single} />);
    const remove = oneSigner.getByRole('button', { name: 'Remove K. Muthusamy' });
    expect(remove.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(remove);
    expect(single.onAuthorityRemove).not.toHaveBeenCalled();
  });

  it('enforces the six-authority maximum and disables editing outside mock mode', async () => {
    const maxProps = makeProps({ authorities: Array.from({ length: 6 }, (_, index) => ({ ...ownershipDocumentsReferenceFixture.authorities[0], id: `owner-${index}` })) });
    const maxView = await renderWithProviders(<OwnershipDocumentsStep {...maxProps} />);
    expect(maxView.getByRole('button', { name: 'Add signing authority' }).props.accessibilityState.disabled).toBe(true);
    await maxView.unmount();

    const readOnly = await renderWithProviders(<OwnershipDocumentsStep {...makeProps({ authorityManagementAvailable: false })} />);
    expect(readOnly.queryByRole('button', { name: 'Edit K. Muthusamy' })).toBeNull();
    expect(readOnly.getByRole('button', { name: 'Add signing authority' }).props.accessibilityState.disabled).toBe(true);
  });

  it('keeps the authority section clear when the list is empty', async () => {
    const { getByText } = await renderWithProviders(<OwnershipDocumentsStep {...makeProps({ authorities: [] })} />);
    expect(getByText('No signing authorities added yet.')).toBeTruthy();
  });

  it('lets the broker choose a legal file category before uploading', async () => {
    const props = makeProps({ selectedDocumentCategory: 'title_deed', onDocumentCategoryChange: jest.fn() });
    const { getByRole } = await renderWithProviders(<OwnershipDocumentsStep {...props} />);
    await fireEvent.press(getByRole('button', { name: 'Survey record document category' }));
    expect(props.onDocumentCategoryChange).toHaveBeenCalledWith('survey');
    await fireEvent.press(getByRole('button', { name: 'Choose file' }));
    expect(props.onChooseDocument).toHaveBeenCalledWith('title_deed');
  });

  it('shows loading and error states without allowing a replacement write from stale data', async () => {
    const loading = await renderWithProviders(<OwnershipDocumentsStep {...makeProps({ authorities: [], isLoadingAuthorities: true })} />);
    expect(loading.getByTestId('signing-authorities-loading')).toBeTruthy();
    expect(loading.getByRole('button', { name: 'Add signing authority' }).props.accessibilityState.disabled).toBe(true);
    await loading.unmount();

    const retry = jest.fn();
    const failed = await renderWithProviders(<OwnershipDocumentsStep {...makeProps({ authorities: [], authoritiesError: 'Could not load signing authorities.', onRetryAuthorities: retry })} />);
    expect(failed.getByRole('alert').props.children).toBe('Could not load signing authorities.');
    expect(failed.getByRole('button', { name: 'Add signing authority' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(failed.getByRole('button', { name: 'Retry loading signing authorities' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows clear empty states when no authorities, documents, or links are supplied', async () => {
    const { getByText } = await renderWithProviders(<OwnershipDocumentsStep {...makeProps({ authorities: [], documents: [], referenceLinks: [] })} />);
    expect(getByText('No signing authorities added yet.')).toBeTruthy();
    expect(getByText('No legal documents added yet. These files stay private to your workspace.')).toBeTruthy();
    expect(getByText('No property links added.')).toBeTruthy();
  });
});
