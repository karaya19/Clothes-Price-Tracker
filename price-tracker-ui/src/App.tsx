import axios from 'axios';
import Product from './product.tsx';
import './App.css'
import { useEffect, useState } from 'react';
import GetProductInfo from './inputProductInfo.tsx';
import type {ProductType} from './types/product.tsx';

function App() {
  const [products, setProducts] = useState<ProductType[] | []>([]);

  useEffect(() => {
    getProducts();
  }, []);

  async function getProducts() {
    let allProducts;
    const token = localStorage.getItem('token');
    try {
      allProducts = await axios.get('http://localhost:8000/api/v1/clothes-tracker/get', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
    console.log('Fetched products:', allProducts.data.products);
    setProducts(allProducts.data.products);
  }

  return (
    <>
      <div className="app-container">
        <div className="input-section">
          <GetProductInfo />
        </div>

        <h2 className="app-title">Product Tracker</h2>

        <div className="products-container">
          {products?.map((product: ProductType) => (
            <Product
              title={product.title}
              currentPrice={product.currentPrice}
              url={product.url}
              imageUrl={product.imageUrl}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default App
