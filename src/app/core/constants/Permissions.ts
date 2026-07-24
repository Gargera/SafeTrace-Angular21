export const Permissions = {
  Cases: {
    GetAll: 'Cases.GetAll',
  },

  UrgentCases: {
    GetById: 'UrgentCases.GetById',
    HardDelete: 'UrgentCases.HardDelete',
    MarkAsFounded: 'UrgentCases.MarkAsFounded',
  },

  LongTermCases: {
    GetById: 'LongTermCases.GetById',
    Create: 'LongTermCases.Create',
    Update: 'LongTermCases.Update',
    SoftDelete: 'LongTermCases.SoftDelete',
    HardDelete: 'LongTermCases.HardDelete',
    Reject: 'LongTermCases.Reject',
    Approve: 'LongTermCases.Approve',
    MarkAsFounded: 'LongTermCases.MarkAsFounded',
  },

  UnknownCases: {
    GetById: 'UnknownCases.GetById',
    Create: 'UnknownCases.Create',
    Update: 'UnknownCases.Update',
    SoftDelete: 'UnknownCases.SoftDelete',
    HardDelete: 'UnknownCases.HardDelete',
    Reject: 'UnknownCases.Reject',
    Approve: 'UnknownCases.Approve',
    MarkAsFounded: 'UnknownCases.MarkAsFounded',
  },

  Dashboard: {
    GetStatistics: 'Dashboard.GetStatistics',
    GetCasesStatistics: 'Dashboard.GetCasesStatistics',
    GetAuditLogs: 'Dashboard.GetAuditLogs',
  },

  AiMatching: {
    Search: 'AiMatching.Search',
  },

  Complaints: {
    GetAll: 'Complaints.GetAll',
    GetById: 'Complaints.GetById',
    HardDelete: 'Complaints.HardDelete',
    MarkAsSolved: 'Complaints.MarkAsSolved',
    GetComplaintsStatistics: 'Complaints.GetComplaintsStatistics',
  },

  Donations: {
    GetDonations: 'Donations.GetDonations',
    GetDonationStatistics: 'Donations.GetDonationStatistics',
  },

  Roles: {
    Create: 'Roles.Create',
    Delete: 'Roles.Delete',
    GetPermissionsByRoleId: 'Roles.GetPermissionsByRoleId',
    UpdateRolePermissions: 'Roles.UpdateRolePermissions',
  },

  Users: {
    GetAll: 'Users.GetAll',
    GetById: 'Users.GetById',
    RegisterByAdmin: 'Users.RegisterByAdmin',
    ChangeRole: 'Users.ChangeRole',
    GetPermissions: 'Users.GetPermissions',
    AssignPermissions: 'Users.AssignPermissions',
    Approve: 'Users.Approve',
    Reject: 'Users.Reject',
    ToggleBlock: 'Users.ToggleBlock',
    GetUsersStatistics: 'Users.GetUsersStatistics',
  },

  Chat: {
    GetAll: 'Chat.GetAll',
    GetById: 'Chat.GetById',
    GetMessages: 'Chat.GetMessages',
    HardDelete: 'Chat.HardDelete',
    DeleteMessageForEveryone: 'Chat.DeleteMessageForEveryone',
    GetChatStatistics: 'Chat.GetChatStatistics',
  }
} as const;
