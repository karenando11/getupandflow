export function ClientSelectionPrompt({ message }) {
  return (
    <div className="selection-prompt">
      <h4>Select a client</h4>
      <p className="subtle-copy">{message}</p>
    </div>
  );
}
