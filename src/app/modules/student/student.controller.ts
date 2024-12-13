import { StudentServices } from './student.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';

// import studentValidationSchema from './student.joi.validation';

// const createStudent = async (req: Request, res: Response) => {
//   try {
//     //creating a schema validation using zod

//     const { student: studentData } = req.body;

//     //data validation using joi
//     // const { error } = studentValidationSchema.validate(studentData); //using for joi
//     // console.log({ error });
//     // const result = await StudentServices.createStudentIntoDB(value); //using for  joi

//     //data validation using zod
//     const zodparsedData = studentValidationSchema.parse(studentData);

//     const result = await StudentServices.createStudentIntoDB(zodparsedData);

//     // if (error) {
//     //   res.status(500).json({
//     //     success: false,
//     //     message: 'Something Went Wrong',
//     //     error: error.details,
//     //   });
//     // }

//     res.status(200).json({
//       success: true,
//       message: 'Student is created successfully',
//       data: result,
//     });
//   } catch (err: any) {
//     res.status(500).json({
//       success: false,
//       message: err.message || 'Something Went Wrong',
//       error: err,
//     });
//   }
// };

const getAllStudents = catchAsync(async (req, res) => {
  const result = await StudentServices.getAllStudentsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Student retrived SuccessFully',
    data: result,
  });
});
const getSingleStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  const result = await StudentServices.getSingleStudentFromDB(studentId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Student is retrived SuccessFully',
    data: result,
  });
});
const updateStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const {student} =req.body;

  const result = await StudentServices.updateStudentIntoDB(studentId ,student);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Student updated SuccessFully',
    data: result,
  });
});

const getDeleteStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  const result = await StudentServices.deleteStudentFromDB(studentId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Student deleted SuccessFully',
    data: result,
  });
});

export const StudentControllers = {
  getAllStudents,
  getSingleStudent,
  getDeleteStudent,
  updateStudent
};
