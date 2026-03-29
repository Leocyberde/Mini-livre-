import { Router } from 'express';
import profilesRouter from './routes/profiles.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import cartRouter from './routes/cart.js';
import motoboysRouter from './routes/motoboys.js';
import reviewsRouter from './routes/reviews.js';
import notificationsRouter from './routes/notifications.js';
import chatRouter from './routes/chat.js';
import productQaRouter from './routes/productQa.js';
import deliveryRouter from './routes/delivery.js';
import authRouter from './routes/auth.js';
import promotionsRouter from './routes/promotions.js';
import geocodeRouter from './routes/geocode.js';

const router = Router();

router.use(profilesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(cartRouter);
router.use(motoboysRouter);
router.use(reviewsRouter);
router.use(notificationsRouter);
router.use(chatRouter);
router.use(productQaRouter);
router.use(deliveryRouter);
router.use(authRouter);
router.use(promotionsRouter);
router.use(geocodeRouter);

export default router;
