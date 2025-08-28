import React, { useRef, useState } from "react";

export default function InviteFootballModal() {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedPlace, setSelectedPlace] = useState<string>("");

  const openModal = () => modalRef.current?.showModal();
  const closeModal = () => modalRef.current?.close();

  const shareInvite = () => {
    const message = `Let's play football at ${selectedPlace} on ${selectedDate} at ${selectedTime}!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <>
      <button className="btn btn-primary" onClick={openModal}>
        Invite Friends
      </button>

      <dialog
        ref={modalRef}
        className="modal modal-bottom sm:modal-middle"
        onCancel={(e) => {
          e.preventDefault();
          closeModal();
        }}
        data-theme="wotnow" // Ensures use of custom WotNow theme
      >
        <form
          method="dialog"
          className="modal-box bg-base-200 text-base-content"
          onSubmit={(e) => e.preventDefault()}
        >
          <h3 className="font-bold text-lg mb-4 text-primary-content">
            Let's play football!
          </h3>

          <div className="chat chat-start mb-4">
            <div className="chat-bubble bg-neutral text-neutral-content">
              Pitch is mint and <br />
              the weather’s a dream <br />
              —time for a beautiful game!
            </div>
          </div>
          <div className="chat chat-end mb-6">
            <div className="chat-bubble bg-primary text-primary-content">
              When and where?
            </div>
          </div>

          <p className="font-semibold text-primary-content mb-2">When?</p>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className={`btn btn-sm ${
                selectedDate === "Today" ? "btn-active bg-secondary" : "bg-base-300"
              } text-secondary-content`}
              onClick={() => setSelectedDate("Today")}
            >
              Today
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                selectedDate === "Tonight" ? "btn-active btn-primary" : "bg-base-300"
              } text-primary-content`}
              onClick={() => setSelectedDate("Tonight")}
            >
              Tonight
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                selectedDate === "Tomorrow"
                  ? "btn-active btn-secondary"
                  : "bg-base-300"
              } text-secondary-content`}
              onClick={() => setSelectedDate("Tomorrow")}
            >
              Tomorrow
            </button>
          </div>

          <label
            htmlFor="datePicker"
            className="block font-semibold text-primary-content mb-1"
          >
            Pick a date
          </label>
          <input
            type="date"
            id="datePicker"
            className="input input-bordered w-full mb-4 bg-base-300 text-base-content"
            value={
              selectedDate && !["Today", "Tonight", "Tomorrow"].includes(selectedDate)
                ? selectedDate
                : ""
            }
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <label
            htmlFor="timePicker"
            className="block font-semibold text-primary-content mb-1"
          >
            Pick a time
          </label>
          <input
            type="time"
            id="timePicker"
            className="input input-bordered w-full mb-6 bg-base-300 text-base-content"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          />

          <p className="font-semibold text-primary-content mb-2">Where?</p>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className={`btn btn-sm ${
                selectedPlace === "My place" ? "btn-active bg-secondary" : "bg-base-300"
              } text-secondary-content`}
              onClick={() => setSelectedPlace("My place")}
            >
              My place
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                selectedPlace === "Your place" ? "btn-active btn-primary" : "bg-base-300"
              } text-primary-content`}
              onClick={() => setSelectedPlace("Your place")}
            >
              Your place
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                selectedPlace === "The usual place"
                  ? "btn-active btn-secondary"
                  : "bg-base-300"
              } text-secondary-content`}
              onClick={() => setSelectedPlace("The usual place")}
            >
              The usual place
            </button>
          </div>

          <input
            type="text"
            placeholder="Search for the venue"
            className="input input-bordered w-full mb-4 bg-base-300 text-base-content"
            list="places"
            onChange={(e) => setSelectedPlace(e.target.value)}
            value={selectedPlace}
          />
          <datalist id="places">
            <option value="Parks near me" />
            <option value="Football pitches near me" />
            <option value="Sports centres near me" />
            <option value="Floodlit pitches near me" />
            <option value="Sports fields near me" />
          </datalist>

          <div className="modal-action flex justify-between">
            <button
              type="button"
              className="btn btn-success"
              onClick={shareInvite}
              disabled={!selectedDate || !selectedTime || !selectedPlace}
            >
              Share
            </button>
            <button type="button" className="btn btn-error" onClick={closeModal}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
