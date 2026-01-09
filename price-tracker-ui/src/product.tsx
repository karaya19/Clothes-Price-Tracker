type ProductProps = {
  title: string;
  price: number;
  url: string;
};

function Product({ title, price, url }: ProductProps) {
  return (
    <div className="product-card">
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
      <p className="product-price">${price}</p>
    </div>
  );
}

export default Product;
