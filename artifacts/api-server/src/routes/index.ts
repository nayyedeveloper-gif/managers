import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import authRouter from "./auth";
import departmentsRouter from "./departments";
import channelsRouter from "./channels";
import messagesRouter from "./messages";
import dmsRouter from "./dms";
import notificationsRouter from "./notifications";
import filesRouter from "./files";
import statsRouter from "./stats";
import spacesRouter from "./spaces";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import goalsRouter from "./goals";
import seedRouter from "./seed";
// import pushRouter from "./push"; // Temporarily disabled due to VAPID configuration issue

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(channelsRouter);
router.use(messagesRouter);
router.use(dmsRouter);
router.use(notificationsRouter);
router.use(filesRouter);
router.use(statsRouter);
router.use(spacesRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(goalsRouter);
router.use(seedRouter);
// router.use(pushRouter); // Temporarily disabled due to VAPID configuration issue

export default router;
