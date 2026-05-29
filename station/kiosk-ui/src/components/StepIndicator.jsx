import { motion } from 'framer-motion'
import useStore from '../store'

function StepIndicator({ total = 5 }) {
  const currentStep = useStore((s) => s.currentStep)
  const steps = Array.from({ length: total }, (_, i) => i)

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center gap-3">
        {steps.map((index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const isUpcoming = index > currentStep
          return (
            <div key={index} className="flex items-center">
              <motion.div
                animate={{
                  scale: isCurrent ? 1.3 : 1,
                  opacity: isUpcoming ? 0.35 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="flex items-center justify-center"
              >
                {isComplete ? (
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                ) : isCurrent ? (
                  <motion.div
                    animate={{ boxShadow: ['0 0 0px #22c55e', '0 0 10px #22c55e', '0 0 0px #22c55e'] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-4 h-4 rounded-full bg-green-400 border-2 border-green-300"
                  />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-gray-600" />
                )}
              </motion.div>
              {index < total - 1 && (
                <div
                  className="w-6 h-px mx-1"
                  style={{ backgroundColor: isComplete ? '#22c55e' : '#374151' }}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400">
        Step {currentStep + 1} of {total}
      </p>
    </div>
  )
}

export default StepIndicator
