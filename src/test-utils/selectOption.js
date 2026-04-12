/**
 * Helper for interacting with the custom <Select> component in tests.
 * Replaces user.selectOptions() which only works with native <select>.
 *
 * The dropdown is rendered via a portal to document.body, so it is not
 * inside the .custom-select container. We search document directly after
 * opening the trigger (only one dropdown is open at a time).
 *
 * Usage:
 *   import { selectOption } from '../../test-utils/selectOption';
 *   await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
 */
export async function selectOption(user, triggerElement, value) {
  await user.click(triggerElement);
  const option = document.querySelector(`[data-value="${value}"]`);
  if (!option) throw new Error(`selectOption: no option found with data-value="${value}"`);
  await user.click(option);
}
