import React, { useState } from 'react';
import axios from 'axios';
import { FaCamera, FaBrain, FaCheckCircle } from 'react-icons/fa';

export default function PlantUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsLoading(true);
    setResult(null);

    try {
      const res = await axios.post('http://localhost:5000/predict', formData);
      const { class_name, confidence } = res.data;
      setResult({
        disease: class_name.replaceAll('_', ' '),
        confidence: Math.round(confidence * 100)
      });
    } catch (err) {
      console.error(err);
      setResult({ error: 'Error al hacer la predicción.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Analiza tu Planta</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input type="file" onChange={handleChange} accept="image/*" className="hidden" id="file-input"/>
          <label htmlFor="file-input" className="block w-full h-64 bg-black/20 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/30 cursor-pointer hover:border-white/50 transition-colors">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-2xl"/>
            ) : (
              <div className="text-center text-white/80">
                <FaCamera className="text-4xl mb-3 mx-auto"/>
                <p className="text-sm">Haz clic para seleccionar una imagen</p>
              </div>
            )}
          </label>
        </div>
        <button type="submit" disabled={!file || isLoading} className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${!file || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-105'}`}>
          {isLoading ? (<div className="flex items-center justify-center"><FaBrain className="animate-pulse mr-2"/>Analizando...</div>) : 'Iniciar Diagnóstico'}
        </button>
      </form>

      {result && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Resultados</h2>
          {result.error ? (
            <div className="text-center text-red-600"><p className="text-lg">{result.error}</p></div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-3xl text-green-600"/>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{result.disease}</h3>
              <p className="text-lg text-gray-600">Confianza: {result.confidence}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
