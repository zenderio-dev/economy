import './button.css';

export function Button({ type = 'button', children }) {
  return <button className="button" type={type}>{children}</button>;
}
