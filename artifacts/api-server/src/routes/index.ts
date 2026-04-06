import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import departmentsRouter from "./departments";
import channelsRouter from "./channels";
import messagesRouter from "./messages";
import notificationsRouter from "./notifications";
import filesRouter from "./files";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(channelsRouter);
router.use(messagesRouter);
router.use(notificationsRouter);
router.use(filesRouter);
router.use(statsRouter);

export default router;
