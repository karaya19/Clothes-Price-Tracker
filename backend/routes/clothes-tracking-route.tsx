import express from 'express'
const router = express.Router()
import {deleteProduct, addProduct, getAllProducts} from '../controllers/productsHandler.js'

router.post('/post', addProduct)
router.get('/get',getAllProducts)
router.delete('/delete/:_id', deleteProduct)
//router.patch('/update/:id', updateSubscription)

export default router;