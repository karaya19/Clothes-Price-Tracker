import express from 'express'
const router = express.Router()
import {addProduct, getAllProducts} from '../controllers/productsHandler.js'

router.post('/post', addProduct)
router.get('/get',getAllProducts)
//router.delete('/delete/:id', deleteSubscription)
//router.patch('/update/:id', updateSubscription)

export default router;