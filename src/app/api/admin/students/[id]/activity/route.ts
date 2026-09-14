import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/server/admin-api";
import { parseLabResults } from "@/lib/disease-lab-results";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสผู้ใช้ที่ต้องการดูประวัติ" },
        { status: 400 }
      );
    }

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        name: true,
        isActive: true,
        createdAt: true,
        groupMemberships: {
          select: {
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลนักเรียนนี้ในระบบ" },
        { status: 404 }
      );
    }

    // Fetch all activities across the 5 roles concurrently
    const [patientCards, nurseInterviews, labResults, doctorDiagnoses, pharmacyDispenses] =
      await Promise.all([
        // 1. Role: ห้องบัตร (Clerk)
        prisma.patientCard.findMany({
          where: { clerkId: id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            queueNumber: true,
            classroomName: true,
            groupName: true,
            patientPrefix: true,
            patientFirstName: true,
            patientLastName: true,
            age: true,
            gender: true,
            maritalStatus: true,
            diseaseCode: true,
            createdAt: true,
            doctorDiagnosis: {
              select: {
                doctorName: true,
                diseaseName: true,
                isCorrect: true,
              },
            },
            pharmacyDispense: {
              select: {
                pharmacistName: true,
              },
            },
          },
        }),

        // 2. Role: พยาบาล (Nurse)
        prisma.nurseInterview.findMany({
          where: { nurseId: id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            patientCardId: true,
            queueNumber: true,
            classroomName: true,
            groupName: true,
            patientPrefix: true,
            patientFirstName: true,
            patientLastName: true,
            age: true,
            gender: true,
            maritalStatus: true,
            weightKg: true,
            heightCm: true,
            systolicBp: true,
            diastolicBp: true,
            pulseBpm: true,
            chronicDiseaseStatus: true,
            chronicDiseaseDetails: true,
            chiefComplaint: true,
            symptomDescription: true,
            notes: true,
            createdAt: true,
            doctorDiagnosis: {
              select: {
                doctorName: true,
                diseaseName: true,
                isCorrect: true,
              },
            },
          },
        }),

        // 3. Role: เทคนิคการแพทย์ (Medical Technologist)
        prisma.labResult.findMany({
          where: { medTechId: id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            patientCardId: true,
            nurseInterviewId: true,
            queueNumber: true,
            classroomName: true,
            groupName: true,
            patientPrefix: true,
            patientFirstName: true,
            patientLastName: true,
            age: true,
            gender: true,
            maritalStatus: true,
            panelDiseaseCode: true,
            panelDiseaseName: true,
            labItems: true,
            isCorrect: true,
            notes: true,
            createdAt: true,
            doctorDiagnosis: {
              select: {
                doctorName: true,
                diseaseName: true,
                isCorrect: true,
              },
            },
          },
        }),

        // 4. Role: แพทย์ (Doctor)
        prisma.doctorDiagnosis.findMany({
          where: { doctorId: id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            patientCardId: true,
            nurseInterviewId: true,
            queueNumber: true,
            classroomName: true,
            groupName: true,
            patientPrefix: true,
            patientFirstName: true,
            patientLastName: true,
            age: true,
            gender: true,
            maritalStatus: true,
            diseaseCode: true,
            diseaseName: true,
            doctorDiagnosis: true,
            treatmentPlan: true,
            notes: true,
            isCorrect: true,
            evaluationScore: true,
            aiModel: true,
            aiFeedback: true,
            aiStrengths: true,
            aiEvaluatedAt: true,
            createdAt: true,
            patientCard: {
              select: {
                diseaseCode: true,
              },
            },
          },
        }),

        // 5. Role: เภสัชกร (Pharmacist)
        prisma.pharmacyDispense.findMany({
          where: { pharmacistId: id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            patientCardId: true,
            nurseInterviewId: true,
            doctorDiagnosisId: true,
            queueNumber: true,
            classroomName: true,
            groupName: true,
            patientPrefix: true,
            patientFirstName: true,
            patientLastName: true,
            age: true,
            gender: true,
            maritalStatus: true,
            diseaseName: true,
            doctorDiagnosisText: true,
            medicines: true,
            totalTablets: true,
            createdAt: true,
          },
        }),
      ]);

    // Calculate Doctor metrics
    const doctorCorrectCount = doctorDiagnoses.filter((d) => d.isCorrect === true).length;
    const doctorDiagnosesWithScore = doctorDiagnoses.filter(
      (d) => typeof d.evaluationScore === "number"
    );
    const doctorAvgScore =
      doctorDiagnosesWithScore.length > 0
        ? Number(
            (
              doctorDiagnosesWithScore.reduce(
                (sum, d) => sum + (d.evaluationScore || 0),
                0
              ) / doctorDiagnosesWithScore.length
            ).toFixed(1)
          )
        : null;

    // Calculate Medical Technologist metrics
    const labCorrectCount = labResults.filter((l) => l.isCorrect === true).length;
    const labWithKeyCount = labResults.filter((l) => l.isCorrect !== null).length;

    // Calculate Pharmacist metrics
    const pharmacistTotalTablets = pharmacyDispenses.reduce(
      (sum, p) => sum + (p.totalTablets || 0),
      0
    );

    // Summary statistics
    const summary = {
      totalSubmissions:
        patientCards.length +
        nurseInterviews.length +
        labResults.length +
        doctorDiagnoses.length +
        pharmacyDispenses.length,
      clerkCount: patientCards.length,
      nurseCount: nurseInterviews.length,
      medTechCount: labResults.length,
      doctorCount: doctorDiagnoses.length,
      pharmacistCount: pharmacyDispenses.length,
      medTechStats: {
        total: labResults.length,
        correct: labCorrectCount,
        accuracyPercent:
          labWithKeyCount > 0 ? Math.round((labCorrectCount / labWithKeyCount) * 100) : 0,
      },
      doctorStats: {
        total: doctorDiagnoses.length,
        correct: doctorCorrectCount,
        accuracyPercent:
          doctorDiagnoses.length > 0
            ? Math.round((doctorCorrectCount / doctorDiagnoses.length) * 100)
            : 0,
        avgScore: doctorAvgScore,
      },
      pharmacistStats: {
        total: pharmacyDispenses.length,
        totalTablets: pharmacistTotalTablets,
      },
    };

    // Unify all submissions into a chronological list
    type ActivityItem = {
      id: string;
      role: "CLERK" | "NURSE" | "MEDTECH" | "DOCTOR" | "PHARMACIST";
      roleLabel: string;
      createdAt: string;
      queueNumber: number | null;
      classroomName: string;
      groupName: string;
      patient: {
        prefix: string;
        firstName: string;
        lastName: string;
        fullName: string;
        age: number;
        gender: string;
        maritalStatus: string;
      };
      payload: Record<string, unknown>;
    };

    const activities: ActivityItem[] = [];

    // Map Clerk
    for (const item of patientCards) {
      activities.push({
        id: `clerk-${item.id}`,
        role: "CLERK",
        roleLabel: "ห้องบัตร",
        createdAt: item.createdAt.toISOString(),
        queueNumber: item.queueNumber,
        classroomName: item.classroomName,
        groupName: item.groupName,
        patient: {
          prefix: item.patientPrefix,
          firstName: item.patientFirstName,
          lastName: item.patientLastName,
          fullName: `${item.patientPrefix}${item.patientFirstName} ${item.patientLastName}`.trim(),
          age: item.age,
          gender: item.gender,
          maritalStatus: item.maritalStatus,
        },
        payload: {
          diseaseCode: item.diseaseCode,
          doctorName: item.doctorDiagnosis?.doctorName || null,
          doctorDisease: item.doctorDiagnosis?.diseaseName || null,
          doctorIsCorrect: item.doctorDiagnosis?.isCorrect ?? null,
          pharmacistName: item.pharmacyDispense?.pharmacistName || null,
        },
      });
    }

    // Map Nurse
    for (const item of nurseInterviews) {
      const weight = item.weightKg ? Number(item.weightKg) : null;
      const height = item.heightCm ? Number(item.heightCm) : null;
      let bmi: number | null = null;
      if (weight && height && height > 0) {
        const heightMeters = height / 100;
        bmi = Number((weight / (heightMeters * heightMeters)).toFixed(1));
      }

      activities.push({
        id: `nurse-${item.id}`,
        role: "NURSE",
        roleLabel: "พยาบาล",
        createdAt: item.createdAt.toISOString(),
        queueNumber: item.queueNumber,
        classroomName: item.classroomName,
        groupName: item.groupName,
        patient: {
          prefix: item.patientPrefix,
          firstName: item.patientFirstName,
          lastName: item.patientLastName,
          fullName: `${item.patientPrefix}${item.patientFirstName} ${item.patientLastName}`.trim(),
          age: item.age,
          gender: item.gender,
          maritalStatus: item.maritalStatus,
        },
        payload: {
          weightKg: weight,
          heightCm: height,
          bmi,
          systolicBp: item.systolicBp,
          diastolicBp: item.diastolicBp,
          pulseBpm: item.pulseBpm,
          chronicDiseaseStatus: item.chronicDiseaseStatus,
          chronicDiseaseDetails: item.chronicDiseaseDetails,
          chiefComplaint: item.chiefComplaint,
          symptomDescription: item.symptomDescription,
          notes: item.notes,
          doctorName: item.doctorDiagnosis?.doctorName || null,
          doctorDisease: item.doctorDiagnosis?.diseaseName || null,
        },
      });
    }

    // Map Medical Technologist
    for (const item of labResults) {
      activities.push({
        id: `medtech-${item.id}`,
        role: "MEDTECH",
        roleLabel: "เทคนิคการแพทย์",
        createdAt: item.createdAt.toISOString(),
        queueNumber: item.queueNumber,
        classroomName: item.classroomName,
        groupName: item.groupName,
        patient: {
          prefix: item.patientPrefix,
          firstName: item.patientFirstName,
          lastName: item.patientLastName,
          fullName: `${item.patientPrefix}${item.patientFirstName} ${item.patientLastName}`.trim(),
          age: item.age,
          gender: item.gender,
          maritalStatus: item.maritalStatus,
        },
        payload: {
          panelDiseaseCode: item.panelDiseaseCode,
          panelDiseaseName: item.panelDiseaseName,
          labItems: parseLabResults(item.labItems),
          isCorrect: item.isCorrect,
          notes: item.notes,
          doctorName: item.doctorDiagnosis?.doctorName || null,
          doctorDisease: item.doctorDiagnosis?.diseaseName || null,
        },
      });
    }

    // Map Doctor
    for (const item of doctorDiagnoses) {
      activities.push({
        id: `doctor-${item.id}`,
        role: "DOCTOR",
        roleLabel: "แพทย์",
        createdAt: item.createdAt.toISOString(),
        queueNumber: item.queueNumber,
        classroomName: item.classroomName,
        groupName: item.groupName,
        patient: {
          prefix: item.patientPrefix,
          firstName: item.patientFirstName,
          lastName: item.patientLastName,
          fullName: `${item.patientPrefix}${item.patientFirstName} ${item.patientLastName}`.trim(),
          age: item.age,
          gender: item.gender,
          maritalStatus: item.maritalStatus,
        },
        payload: {
          diseaseCode: item.diseaseCode,
          diseaseName: item.diseaseName,
          expectedDiseaseCode: item.patientCard?.diseaseCode || null,
          doctorDiagnosis: item.doctorDiagnosis,
          treatmentPlan: item.treatmentPlan,
          notes: item.notes,
          isCorrect: item.isCorrect,
          evaluationScore: item.evaluationScore,
          aiModel: item.aiModel,
          aiFeedback: item.aiFeedback,
          aiStrengths: item.aiStrengths,
          aiEvaluatedAt: item.aiEvaluatedAt ? item.aiEvaluatedAt.toISOString() : null,
        },
      });
    }

    // Map Pharmacist
    for (const item of pharmacyDispenses) {
      activities.push({
        id: `pharmacist-${item.id}`,
        role: "PHARMACIST",
        roleLabel: "เภสัชกร",
        createdAt: item.createdAt.toISOString(),
        queueNumber: item.queueNumber,
        classroomName: item.classroomName,
        groupName: item.groupName,
        patient: {
          prefix: item.patientPrefix,
          firstName: item.patientFirstName,
          lastName: item.patientLastName,
          fullName: `${item.patientPrefix}${item.patientFirstName} ${item.patientLastName}`.trim(),
          age: item.age,
          gender: item.gender,
          maritalStatus: item.maritalStatus,
        },
        payload: {
          diseaseName: item.diseaseName,
          doctorDiagnosisText: item.doctorDiagnosisText,
          medicines: item.medicines,
          totalTablets: item.totalTablets,
        },
      });
    }

    // Sort newest to oldest
    activities.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        student: {
          ...student,
          createdAt: student.createdAt.toISOString(),
        },
        summary,
        activities,
      },
    });
  } catch (error) {
    console.error("Error fetching student activity:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการโหลดประวัติของนักเรียน" },
      { status: 500 }
    );
  }
}
