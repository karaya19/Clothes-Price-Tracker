import type {ProductType} from './types/product.tsx';


function Product({ title, currentPrice, url, imageUrl }: ProductType) {
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
    </div>
  );
}

export default Product;
