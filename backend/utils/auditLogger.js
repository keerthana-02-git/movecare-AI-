import { AuditLog } from '../models/index.js';

export const logAuditEvent = async ({
  action,
  performedBy,
  performedByRole,
  targetEntity,
  details,
  req,
}) => {
  try {
    const ipAddress =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';

    const userAgent = req?.headers?.['user-agent'] || 'internal';

    let actorId = null;
    let actorRole = performedByRole || 'System';

    if (performedBy) {
      if (typeof performedBy === 'object' && performedBy._id) {
        actorId = performedBy._id;
        if (!performedByRole && performedBy.role) {
          actorRole = performedBy.role;
        }
      } else {
        actorId = performedBy;
      }
    } else if (req?.user) {
      actorId = req.user._id;
      if (!performedByRole && req.user.role) {
        actorRole = req.user.role;
      }
    }

    const logEntry = await AuditLog.create({
      action,
      performedBy: actorId,
      performedByRole: actorRole,
      targetEntity,
      details,
      ipAddress,
      userAgent,
    });

    return logEntry;
  } catch (error) {
    // Non-blocking logger to ensure core healthcare operations proceed uninterrupted
    console.error('AuditLog writing failed:', error.message);
    return null;
  }
};
