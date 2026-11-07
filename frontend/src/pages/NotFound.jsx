import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center text-center p-4">
    <div>
      <p className="text-8xl mb-4">🌾</p>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-500 mb-6">Page not found</p>
      <Button as={Link} to="/">Go Home</Button>
    </div>
  </div>
);

export default NotFound;
