import QueryBuilder from '../../builder/QueryBuilder';
import { TOfferedCourse } from './OfferedCourse.interface';
import { OfferedCourse } from './OfferedCourse.model';

import { Course } from '../Course/course.model';
import { Faculty } from '../Faculty/faculty.model';

import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { AcademicFaculty } from '../AcademicFaculty/Academicfaculty.model';
import { AcademicDepartment } from '../AcademicDepartment/AcademicDepartment.model';
import { SemesterRegistration } from '../SemesterRegistration/semesterRegistration.model';
import { hasTimeConflict } from './OfferedCourse.utils';
import { Student } from '../student/student.model';

const createOfferedCourseIntoDb = async (payload: TOfferedCourse) => {
  const {
    semesterRegistration,
    academicFaculty,
    academicDepartment,
    course,
    section,

    faculty,
    days,
    startTime,
    endTime,
  } = payload;
  //check if the semester registration id is exists!
  const isSemesterRegistrationExits =
    await SemesterRegistration.findById(semesterRegistration);

  if (!isSemesterRegistrationExits) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Semester registration not found !',
    );
  }

  const academicSemester = isSemesterRegistrationExits.academicSemester;

  const isAcademicFacultyExits =
    await AcademicFaculty.findById(academicFaculty);

  if (!isAcademicFacultyExits) {
    throw new AppError(httpStatus.NOT_FOUND, 'Academic Faculty not found !');
  }

  const isAcademicDepartmentExits =
    await AcademicDepartment.findById(academicDepartment);

  if (!isAcademicDepartmentExits) {
    throw new AppError(httpStatus.NOT_FOUND, 'Academic Department not found !');
  }
  const isCourseExits = await Course.findById(course);

  if (!isCourseExits) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course not found !');
  }

  const isFacultyExits = await Faculty.findById(faculty);

  if (!isFacultyExits) {
    throw new AppError(httpStatus.NOT_FOUND, 'Faculty not found !');
  }
  // check if the department is belong to the  faculty
  const isDepartmentBelongToFaculty = await AcademicDepartment.findOne({
    _id: academicDepartment,
    academicFaculty,
  });

  if (!isDepartmentBelongToFaculty) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This ${isAcademicDepartmentExits.name} is not  belong to this ${isAcademicFacultyExits.name}`,
    );
  }
  // check if the same offered course same section in same registered semester exists

  const isSameOfferedCourseExistsWithSameRegisteredSemesterWithSameSection =
    await OfferedCourse.findOne({
      semesterRegistration,
      course,
      section,
    });

  if (isSameOfferedCourseExistsWithSameRegisteredSemesterWithSameSection) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Offered course with same section is already exist!`,
    );
  }
  // get the schedules of the faculties
  const assignedSchedules = await OfferedCourse.find({
    semesterRegistration,
    faculty,
    days: { $in: days },
  }).select('days startTime endTime');

  const newSchedule = {
    days,
    startTime,
    endTime,
  };
  if (hasTimeConflict(assignedSchedules, newSchedule)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This faculty is not available at that time ! Choose other time or day`,
    );
  }

  const result = await OfferedCourse.create({ ...payload, academicSemester });
  return result;
};

const getAllOfferedCoursesFromDb = async (query: Record<string, unknown>) => {
  const offeredCourseQuery = new QueryBuilder(OfferedCourse.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await offeredCourseQuery.modelQuery;
  const meta = await offeredCourseQuery.countTotal();

  return {
    meta,
    result,
  };
};
const getMyOfferedCoursesFromDb=async(userId:string, query:Record<string,unknown>)=>{
   //pagination setup

   const page = Number(query?.page) || 1;
   const limit = Number(query?.limit) || 10;
   const skip = (page - 1) * limit;
 
  const student = await Student.findOne({id : userId });
  console.log(student)
 //find the student
  if(!student){
    throw new AppError(httpStatus.NOT_FOUND,'User is not Found')
  }
//find current ongoing semester

const currentOngoingRegistrationSemester = await SemesterRegistration.findOne({
  status:'ONGOING',
});

//find current ongoing semester
if(!currentOngoingRegistrationSemester ){
  throw new AppError(httpStatus.NOT_FOUND,'There is no ongoing semester registration')
}


const aggregationQuery =[
  {
    $match :{
      semesterRegistration:currentOngoingRegistrationSemester?._id,
      // academicFaculty:student.academicFaculty,
      // academicDepartment:student.academicDepartment,
    }
  },
  {
    $lookup:{
      from:'courses',
      localField:'course',
      foreignField:'_id',
      as:'course'
    }
  },
  {
    $unwind:"$course"
  },
  {
    $lookup:{
      from:'enrolledcourses',
      let:{
        currentOngoingRegistrationSemester:currentOngoingRegistrationSemester._id,
        currentStudent:student._id,
      },
      pipeline:[
        {
          $match:{
            $expr:{
              $and:[
                {
                  $eq:['$semesterRegistration','$$currentOngoingRegistrationSemester']
                },
                {
                  $eq:['$student','$$currentStudent']
                },
                {
                  $eq:['$isEnrolled',true],
                },


              ]
            }
          }
        }
      ],
      as:'enrolledCourses',

    }
  },
  {
    $lookup:{
      from:'enrolledcourses',
      let:{
       currentStudent:student._id,
      },
      pipeline:[
        {
          $match:{
            $expr:{
              $and:[
                {
                   $eq:['$student','$$currentStudent']
                },
                {
                   $eq:['$isCompleted',true]
                },
                 
                


              ]
            }
          }
        }
      ],
      as:'completedCourses',
 
    }

  },
  {
    $addFields:{
      completedCourseIds:{
        $map:{
          input:"$completedCourses",
          as:'completed',
          in:'$$completed.course'
        }
      }
    }

  },
  {
    
    $addFields: {
      isPreRequisitesFulFilled: {
        $or: [
          { $eq: ['$course.preRequisiteCourses', []] },
          {
            $setIsSubset: [
              '$course.preRequisiteCourses.course',
              '$completedCourseIds',
            ],
          },
        ],
      },


      isAlreadyEnrolled:{
        $in:[
          '$course._id',
          {
          $map :{
            input:'$enrolledCourses',
            as:'enroll',
            in:'$$enroll.course',
  
  
          }
        }
      ]
      }
 
    }

  },
  {
    $match:{
      isAlreadyEnrolled : false,
      isPreRequisitesFulFilled: true,
    }
  },
  

   

]

const paginationQuery =[{
  $skip:skip
},
{
  $limit:limit
},]

const result = await OfferedCourse.aggregate([...aggregationQuery,...paginationQuery]);
const total = (await OfferedCourse.aggregate(aggregationQuery)).length;
const totalPage = Math.ceil(result.length / limit);


return {
  meta: {
    page,
    limit,
    total,
    totalPage,
  },
  result,
};
}

const getSingleOfferedCourseFromDb = async (id: string) => {
  const offeredCourse = await OfferedCourse.findById(id);
  return offeredCourse;
};
const updateOfferedCourseIntoDb = async (
  id: string,
  payload: Pick<TOfferedCourse, 'faculty' | 'days' | 'startTime' | 'endTime'>,
) => {
  /**
   * Step 1: check if the offered course exists
   * Step 2: check if the faculty exists
   * Step 3: check if the semester registration status is upcoming
   * Step 4: check if the faculty is available at that time. If not then throw error
   * Step 5: update the offered course
   */
  const { faculty, days, startTime, endTime } = payload;

  const isOfferedCourseExists = await OfferedCourse.findById(id);

  if (!isOfferedCourseExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'Offered course not found !');
  }

  const isFacultyExists = await Faculty.findById(faculty);

  if (!isFacultyExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'Faculty not found !');
  }

  const semesterRegistration = isOfferedCourseExists.semesterRegistration;
  // get the schedules of the faculties

  // Checking the status of the semester registration
  const semesterRegistrationStatus =
    await SemesterRegistration.findById(semesterRegistration);

  if (semesterRegistrationStatus?.status !== 'UPCOMING') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You can not update this offered course as it is ${semesterRegistrationStatus?.status}`,
    );
  }

  // check if the faculty is available at that time.
  const assignedSchedules = await OfferedCourse.find({
    semesterRegistration,
    faculty,
    days: { $in: days },
  }).select('days startTime endTime');

  const newSchedule = {
    days,
    startTime,
    endTime,
  };

  if (hasTimeConflict(assignedSchedules, newSchedule)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This faculty is not available at that time ! Choose other time or day`,
    );
  }

  const result = await OfferedCourse.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

const deleteOfferedCourseFromDb = async (id: string) => {
  const offeredCourse = await OfferedCourse.findById(id);
  return offeredCourse;
};
export const OfferedCourseServices = {
  createOfferedCourseIntoDb,
  getAllOfferedCoursesFromDb,
  getMyOfferedCoursesFromDb,
  getSingleOfferedCourseFromDb,
  deleteOfferedCourseFromDb,
  updateOfferedCourseIntoDb,
};
