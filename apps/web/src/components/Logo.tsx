import logo from '../assets/logo.png';

export function Logo({ size = 28 }: { size?: number }) {
  return <img src={logo} alt="logo" width={size} height={size} />;
}
