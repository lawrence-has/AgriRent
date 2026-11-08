import { Link } from 'react-router-dom';
import { Wheat } from 'lucide-react';
import Button from '../components/common/Button';

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center text-center p-4">
    <div>
      <div className="flex justify-center mb-4 text-gray-200">
        <Wheat size={80} strokeWidth={1} />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-500 mb-6">Page not found</p>
      <Button as={Link} to="/">Go Home</Button>
    </div>
  </div>
);

export default NotFound;
