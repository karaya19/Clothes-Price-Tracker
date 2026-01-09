import { useState } from "react";
import axios from "axios";

function getProductInfo() {
  const [productUrl, setProductUrl] = useState("");
  const [size, setSize] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  function handleAddProduct() {
    try {
      console.log('Adding product:', { url: productUrl, size, notifications: notificationsEnabled });
      const token = localStorage.getItem('token');
      axios.post(
        'http://localhost:8000/api/v1/clothes-tracker/post',
        {
          url: productUrl,
          size: size,
          notifications: notificationsEnabled
        },
        {
          headers: {
            Authorization: 'Bearer ' + token
          }
        }
      )
      .then((response) => {
        console.log('Product added successfully:', response.data);
      });
    } catch (error) {
      console.error('Error adding product:', error);
    }
  }

  return (
    <div className="product-input-container">
      <input
        className="product-input url-input"
        type="text"
        placeholder="Product URL"
        value={productUrl}
        onChange={(e) => setProductUrl(e.target.value)}
      />

      <input
        className="product-input size-input"
        type="text"
        placeholder="Size"
        value={size}
        onChange={(e) => setSize(e.target.value)}
      />

      <label className="notifications-toggle">
        <input
          type="checkbox"
          checked={notificationsEnabled}
          onChange={(e) => setNotificationsEnabled(e.target.checked)}
        />
        <span className="toggle-label">Enable Notifications</span>
      </label>

      <button
        className="add-product-button"
        onClick={handleAddProduct}
      >
        Add Product
      </button>
    </div>
  );
}

export default getProductInfo;
