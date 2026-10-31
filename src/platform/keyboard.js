import { Keyboard } from '@capacitor/keyboard';

// Calls the callback with true/false as the soft keyboard opens/closes; resolves a disposer.
export async function onKeyboardVisibility(callback) {
  const handles = await Promise.all([
    Keyboard.addListener('keyboardWillShow', () => callback(true)),
    Keyboard.addListener('keyboardWillHide', () => callback(false)),
  ]);
  return () => Promise.all(handles.map((handle) => handle.remove()));
}
