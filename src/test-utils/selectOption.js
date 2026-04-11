/**
 * Helper for interacting with the custom <Select> component in tests.
 * Replaces user.selectOptions() which only works with native <select>.
 *
 * Usage:
 *   import { selectOption } from '../../test-utils/selectOption';
 *   await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
 */
export async function selectOption(user, triggerElement, value) {
  await user.click(triggerElement);
  // Scope to the parent .custom-select container so multiple selects
  // with the same option values don't interfere with each other.
  const container = triggerElement.closest('.custom-select') ?? document;
  const option = container.querySelector(`[data-value="${value}"]`);
  if (!option) throw new Error(`selectOption: no option found with data-value="${value}"`);
  await user.click(option);
}
