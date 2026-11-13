"use client";
// If one part of the screen fails to draw, only that part shows a short message with a retry button;
// the rest of the app keeps working.
import { Component } from "react";

export class Safe extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error("section failed", err); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="notcrop" role="alert">
        <b>یہ حصہ ابھی نہیں کھل سکا</b>
        <p>دوبارہ کوشش کریں۔ باقی ایپ ٹھیک چل رہی ہے۔</p>
        <button type="button" className="btn ghost" onClick={() => this.setState({ err: null })}>دوبارہ کوشش</button>
      </div>
    );
  }
}
