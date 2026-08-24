"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.AttendanceStatus = exports.ReturnStatus = exports.ExitStatus = exports.GatePassStatus = exports.RequestType = exports.RequestStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["HR"] = "HR";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["EMPLOYEE"] = "EMPLOYEE";
    UserRole["SECURITY_GUARD"] = "SECURITY_GUARD";
})(UserRole || (exports.UserRole = UserRole = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["PENDING_MANAGER"] = "PENDING_MANAGER";
    RequestStatus["PENDING_HR"] = "PENDING_HR";
    RequestStatus["APPROVED"] = "APPROVED";
    RequestStatus["REJECTED"] = "REJECTED";
    RequestStatus["CANCELLED"] = "CANCELLED";
    RequestStatus["EXPIRED"] = "EXPIRED";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var RequestType;
(function (RequestType) {
    RequestType["LEAVE"] = "LEAVE";
    RequestType["EXIT"] = "EXIT";
})(RequestType || (exports.RequestType = RequestType = {}));
var GatePassStatus;
(function (GatePassStatus) {
    GatePassStatus["ACTIVE"] = "ACTIVE";
    GatePassStatus["USED"] = "USED";
    GatePassStatus["EXPIRED"] = "EXPIRED";
    GatePassStatus["CANCELLED"] = "CANCELLED";
})(GatePassStatus || (exports.GatePassStatus = GatePassStatus = {}));
var ExitStatus;
(function (ExitStatus) {
    ExitStatus["PENDING"] = "PENDING";
    ExitStatus["EXITED"] = "EXITED";
})(ExitStatus || (exports.ExitStatus = ExitStatus = {}));
var ReturnStatus;
(function (ReturnStatus) {
    ReturnStatus["PENDING"] = "PENDING";
    ReturnStatus["RETURNED"] = "RETURNED";
    ReturnStatus["LATE_RETURN"] = "LATE_RETURN";
})(ReturnStatus || (exports.ReturnStatus = ReturnStatus = {}));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["ON_LEAVE"] = "ON_LEAVE";
    AttendanceStatus["ON_EXIT_PERMISSION"] = "ON_EXIT_PERMISSION";
    AttendanceStatus["HALF_DAY"] = "HALF_DAY";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "INFO";
    NotificationType["APPROVAL_REQUEST"] = "APPROVAL_REQUEST";
    NotificationType["REQUEST_APPROVED"] = "REQUEST_APPROVED";
    NotificationType["REQUEST_REJECTED"] = "REQUEST_REJECTED";
    NotificationType["GATE_PASS_GENERATED"] = "GATE_PASS_GENERATED";
    NotificationType["LATE_RETURN_ALERT"] = "LATE_RETURN_ALERT";
    NotificationType["GATE_EXIT_LOGGED"] = "GATE_EXIT_LOGGED";
    NotificationType["GATE_RETURN_LOGGED"] = "GATE_RETURN_LOGGED";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
