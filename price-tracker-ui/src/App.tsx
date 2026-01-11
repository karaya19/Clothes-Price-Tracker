import axios from 'axios';
import Product from './product.tsx';
import './App.css'
import { useEffect, useState } from 'react';
import GetProductInfo from './inputProductInfo.tsx';
import type {ProductType} from './types/product.tsx';



function Dashboard() {
  const [products, setProducts] = useState<ProductType[] | []>([]);

  useEffect(() => {
    getProducts(setProducts);
  }, []);

  return (
    <>
      <div className="app-container">
        <div className="input-section">
          <GetProductInfo setProducts={setProducts} />
        </div>

        <h2 className="app-title">Product Tracker</h2>

        <div className="products-container">
          {products?.map((product: ProductType) => (
            <Product
              _id={product._id}
              title={product.title}
              currentPrice={product.currentPrice}
              url={product.url}
              imageUrl={product.imageUrl}
              setProducts={setProducts}
            />
          ))}
        </div>
      </div>
    </>
  )
}

async function getProducts(setProducts: (products: ProductType[] | []) => void) {
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

export {Dashboard,getProducts};
