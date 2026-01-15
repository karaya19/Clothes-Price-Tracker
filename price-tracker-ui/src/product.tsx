import type {ProductType} from './types/product.tsx';
import axios from 'axios';

type ProductProps = ProductType & {
  setProducts: React.Dispatch<React.SetStateAction<ProductType[]>>;
};

function Product({ _id, title, currentPrice, url, imageUrl , setProducts }: ProductProps) {
  async function handleDelete() {
    try{
    console.log("deleting product id:", _id);
    console.log("type:", typeof _id);
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/v1/clothes-tracker/delete/${_id}`, {
      headers:{
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("updateeed" + response.data.products);
    setProducts(response.data.products);
    }
    catch(error){
      console.error("Failed to delete product:", error);
  }
}
  return (
    <div className="product-card">
      {imageUrl && (
        <img className="product-image" src={imageUrl} alt={title} />
      )}
      <h2 className="product-title">
        <a
          className="product-link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {title}
        </a>
      </h2>
      <p className="product-price">${currentPrice}</p>
      <button className="delete-button" onClick={async () => {await handleDelete()}}>delete</button>
    </div>
  );
}

export default Product;
