"use client";

import React from "react";
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
  styled,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useStepperContext } from "./StepperContext";

// Custom connector with gray line and gap
const CustomConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 28,
    left: "calc(-50% + 28px)",
    right: "calc(50% + 28px)",
    [theme.breakpoints.down("sm")]: {
      top: 20,
      left: "calc(-50% + 20px)",
      right: "calc(50% + 20px)",
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 2,
    border: 0,
    backgroundColor: "#D1D5DB",
    borderRadius: 1,
    width: "30%",
    margin: "0 auto",
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: "#45A735",
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: "#45A735",
    },
  },
}));

// Custom step icon component
const CustomStepIcon = (props) => {
  const { active, completed, icon } = props;

  return (
    <Box
      sx={{
        width: { xs: 40, sm: 48, md: 56 },
        height: { xs: 40, sm: 48, md: 56 },
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active || completed ? "#45A735" : "#D1D5DB",
        color: "#FFFFFF",
        fontSize: { xs: "18px", sm: "20px", md: "24px" },
        fontWeight: 700,
        transition: "all 0.3s ease",
      }}
    >
      {icon}
    </Box>
  );
};

const ProcessStepper = () => {
  const { activeStep, isAuthenticated } = useStepperContext();
  const t = useTranslations("stepper");
  const steps = isAuthenticated
    ? [t("servicesShort"), t("hoursShort"), t("summary"), t("payment")]
    : [t("servicesShort"), t("hoursShort"), t("summary"), t("details"), t("payment")];

  return (
    <Box
      sx={{
        width: "100%",
        // py: { xs: 2, sm: 2.5, md: 3, lg: 4 },
        // px: { xs: 0, sm: 0.5, md: 1 },
        marginLeft: { xs: 0, md: 1 },
        boxShadow: { md: "0px 23px 45.6px 0px #0000000A" },
      }}
    >
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        connector={<CustomConnector />}
        sx={{
          "& .MuiStep-root": {
            px: { xs: 0, sm: 0.5, md: 1 },
          },
        }}
      >
        {steps.map((label, index) => (
          <Step key={label} completed={index < activeStep}>
            <StepLabel
              StepIconComponent={CustomStepIcon}
              sx={{
                "& .MuiStepLabel-label": {
                  marginTop: { xs: "8px", sm: "10px", md: "12px" },
                  fontSize: { xs: "11px", sm: "13px", md: "15px", lg: "16px" },
                  fontWeight: index <= activeStep ? 600 : 400,
                  color: index <= activeStep ? "#1F2937" : "#9CA3AF",
                },
                "& .MuiStepLabel-iconContainer": {
                  padding: 0,
                },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default ProcessStepper;
